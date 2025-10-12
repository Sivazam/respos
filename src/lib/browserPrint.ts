export interface Printer {
  name: string;
  id: string;
  isDefault?: boolean;
}

export interface BrowserPrintOptions {
  printerName?: string;
  paperSize?: string;
  copies?: number;
  color?: boolean;
  duplex?: boolean;
  dynamicHeight?: boolean;
  calculatedHeight?: number;
}

export class BrowserPrintService {
  private printers: Printer[] = [];

  constructor() {
    this.detectPrinters();
  }

  // Detect available printers
  private async detectPrinters(): Promise<void> {
    try {
      // Use the browser's print detection if available
      if ('printerList' in window) {
        // @ts-expect-error - Custom API for some browsers
        this.printers = await window.printerList;
      }
    } catch (error) {
      console.log('Printer detection not available:', error);
    }
  }

  // Get available printers
  getAvailablePrinters(): Printer[] {
    return this.printers;
  }

  // Print directly using browser's print API with better formatting
  async printDirect(content: string, options: BrowserPrintOptions = {}): Promise<boolean> {
    const {
      paperSize = '79.5mm 200mm',
      copies = 1,
      color = false,
      duplex = false,
      dynamicHeight = false,
      calculatedHeight = 200
    } = options;

    // Use dynamic height if enabled
    const finalPaperSize = dynamicHeight ? `79.5mm ${calculatedHeight}mm` : paperSize;
    const finalHeight = dynamicHeight ? calculatedHeight : 200;

    try {
      // Try to use the modern print API if available (Chrome/Edge)
      if ('print' in navigator && 'printerCapabilities' in navigator) {
        try {
          // @ts-ignore - Experimental API
          const printCapability = await (navigator as any).printerCapabilities;
          if (printCapability && Array.isArray(printCapability) && printCapability.length > 0) {
            // Use the modern print API for silent printing
            await this.printWithModernAPI(content, { ...options, paperSize: finalPaperSize });
            return true;
          }
        } catch (e) {
          console.log('Modern print API not available, falling back to iframe method');
        }
      }

      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Failed to create print document');
      }

      // Create print-friendly HTML optimized for 79.5mm thermal paper with dynamic height
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${finalHeight}mm</title>
            <meta charset="UTF-8">
            <meta name="paper-size" content="79.5mm ${finalHeight}mm">
            <style>
              /* Force paper size with multiple techniques */
              @page {
                size: 79.5mm ${finalHeight}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              @page :left {
                size: 79.5mm ${finalHeight}mm !important;
              }
              
              @page :right {
                size: 79.5mm ${finalHeight}mm !important;
              }
              
              @page :first {
                size: 79.5mm ${finalHeight}mm !important;
              }
              
              * {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              
              html, body {
                width: 79.5mm !important;
                height: ${finalHeight}mm !important;
                min-height: ${finalHeight}mm !important;
                max-height: ${finalHeight}mm !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                position: relative !important;
              }
              
              body {
                font-family: 'Courier New', monospace !important;
                font-size: 17px !important;
                line-height: 1.15 !important;
                color: #000 !important;
                background: #fff !important;
                margin: 0 !important;
                padding: 3.75mm !important;
                font-weight: bold !important;
                width: 72mm !important;
                height: ${finalHeight - 7.5}mm !important;
                min-height: ${finalHeight - 7.5}mm !important;
                max-height: ${finalHeight - 7.5}mm !important;
                position: relative !important;
                box-sizing: border-box !important;
                display: block !important;
              }
              
              .receipt-content {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                font-weight: bold !important;
                width: 100% !important;
                height: 100% !important;
                font-size: 17px !important;
                line-height: 1.15 !important;
                overflow: hidden !important;
                position: relative !important;
              }
              
              .header {
                font-size: 18px !important;
                font-weight: bold !important;
                text-align: center !important;
                margin-bottom: 1mm !important;
                page-break-inside: avoid !important;
              }
              
              .total {
                font-size: 17px !important;
                font-weight: bold !important;
                page-break-inside: avoid !important;
              }
              
              .small {
                font-size: 14px !important;
                page-break-inside: avoid !important;
              }
              
              /* Print-specific styles with maximum specificity */
              @media print {
                * {
                  margin: 0 !important;
                  padding: 0 !important;
                  box-sizing: border-box !important;
                }
                
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 79.5mm !important;
                  height: ${finalHeight}mm !important;
                  min-height: ${finalHeight}mm !important;
                  max-height: ${finalHeight}mm !important;
                  overflow: hidden !important;
                  position: relative !important;
                }
                
                @page {
                  size: 79.5mm ${finalHeight}mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                @page :left {
                  size: 79.5mm ${finalHeight}mm !important;
                }
                
                @page :right {
                  size: 79.5mm ${finalHeight}mm !important;
                }
                
                @page :first {
                  size: 79.5mm ${finalHeight}mm !important;
                }
                
                body {
                  margin: 0 !important;
                  padding: 3.75mm !important;
                  width: 72mm !important;
                  height: ${finalHeight - 7.5}mm !important;
                  min-height: ${finalHeight - 7.5}mm !important;
                  max-height: ${finalHeight - 7.5}mm !important;
                  font-size: 17px !important;
                  line-height: 1.15 !important;
                  position: relative !important;
                  box-sizing: border-box !important;
                  display: block !important;
                  overflow: hidden !important;
                }
                
                .receipt-content {
                  width: 100% !important;
                  height: 100% !important;
                  font-size: 17px !important;
                  line-height: 1.15 !important;
                  overflow: hidden !important;
                  position: relative !important;
                }
                
                /* Prevent any content from spilling */
                * {
                  overflow: hidden !important;
                  page-break-inside: avoid !important;
                }
                
                /* Force single page */
                html, body {
                  page-break-after: avoid !important;
                  page-break-before: avoid !important;
                }
              }
              
              /* Add print guidance */
              .print-hint {
                position: fixed !important;
                bottom: 5px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                font-size: 10px !important;
                color: #666 !important;
                background: rgba(255,255,255,0.9) !important;
                padding: 2px 5px !important;
                border-radius: 3px !important;
                display: none !important;
              }
              
              @media screen {
                .print-hint {
                  display: block !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-hint">Paper Size: 79.5mm × ${finalHeight}mm</div>
            <div class="receipt-content">${content}</div>
            <script>
              // Enhanced print script with size enforcement
              window.onload = function() {
                console.log('📏 Print size: 79.5mm × ${finalHeight}mm');
                
                // Force print dialog to show correct paper size
                if (window.print) {
                  const originalPrint = window.print;
                  window.print = function() {
                    // Add print metadata
                    document.title = 'Receipt_${finalHeight}mm_${Date.now()}';
                    
                    // Try to set print settings
                    if (window.matchMedia) {
                      const mediaQueryList = window.matchMedia('print');
                      mediaQueryList.addListener(function(mql) {
                        if (!mql.matches) {
                          // Printing has finished
                          window.close();
                        }
                      });
                    }
                    
                    // Call original print
                    originalPrint.call(window);
                    
                    // Fallback close timer
                    setTimeout(() => {
                      window.close();
                    }, 1000);
                  };
                }
                
                setTimeout(() => {
                  window.print();
                }, 300);
              };
              
              // Prevent context menu to avoid user changing settings
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              });
            </script>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // Wait for the iframe to load and print
      return new Promise((resolve) => {
        iframe.onload = () => {
          setTimeout(() => {
            // Remove iframe after printing
            try {
              document.body.removeChild(iframe);
            } catch (e) {
              // Ignore errors when removing iframe
            }
            resolve(true);
          }, 2000);
        };
      });

    } catch (error) {
      console.error('Direct browser print failed:', error);
      return false;
    }
  }

  // Try to use modern print API for silent printing
  private async printWithModernAPI(content: string, options: BrowserPrintOptions): Promise<void> {
    try {
      // @ts-ignore - Experimental API
      const printTicket = {
        size: options.paperSize || '79.5mm 200mm',
        copies: options.copies || 1,
        color: options.color || false,
        duplex: options.duplex || false,
        orientation: 'portrait'
      };

      // Create print content optimized for thermal printer
      const printContent = new Blob([`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @page { size: 79.5mm 200mm; margin: 0; }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 17px; 
                font-weight: bold;
                margin: 0; 
                padding: 3.75mm; 
                width: 72mm;
                height: 192.5mm;
                line-height: 1.15;
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `], { type: 'text/html' });

      // @ts-ignore - Experimental API
      await navigator.print({
        content: printContent,
        ticket: printTicket
      });
    } catch (error) {
      console.error('Modern print API failed:', error);
      throw error;
    }
  }

  // Try to use platform-specific APIs for silent printing
  async printSilent(content: string, options: BrowserPrintOptions = {}): Promise<boolean> {
    const {
      dynamicHeight = false,
      calculatedHeight = 200,
      paperSize = '79.5mm 200mm'
    } = options;

    // Use dynamic height if enabled
    const finalOptions = {
      ...options,
      paperSize: dynamicHeight ? `79.5mm ${calculatedHeight}mm` : paperSize
    };

    try {
      // Try Windows-specific API first
      if (this.isWindows() && 'chrome' in window && 'runtime' in (window as any).chrome) {
        try {
          return await this.printWithWindowsAPI(content, finalOptions);
        } catch (e) {
          console.log('Windows API not available, trying other methods');
        }
      }

      // Try modern print API
      if ('print' in navigator && 'printerCapabilities' in navigator) {
        try {
          // @ts-ignore - Experimental API
          const printCapability = await (navigator as any).printerCapabilities;
          if (printCapability && Array.isArray(printCapability) && printCapability.length > 0) {
            await this.printWithModernAPI(content, finalOptions);
            return true;
          }
        } catch (e) {
          console.log('Modern print API not available');
        }
      }

      // Try to use CSS print media with auto-print
      return await this.printWithAutoPrint(content, finalOptions);
    } catch (error) {
      console.error('Silent printing failed:', error);
      return false;
    }
  }

  // Check if running on Windows
  private isWindows(): boolean {
    return navigator.platform.indexOf('Win') > -1 || navigator.userAgent.indexOf('Windows') > -1;
  }

  // Try to use Windows-specific printing API
  private async printWithWindowsAPI(content: string, options: BrowserPrintOptions): Promise<boolean> {
    try {
      // This would work with a Chrome extension that provides Windows API access
      // For now, we'll use the iframe method with better print handling
      return await this.printWithAutoPrint(content, options);
    } catch (error) {
      console.error('Windows API print failed:', error);
      return false;
    }
  }

  // Print with auto-print script that tries to bypass dialog
  private async printWithAutoPrint(content: string, options: BrowserPrintOptions): Promise<boolean> {
    const {
      paperSize = '79.5mm 200mm',
      dynamicHeight = false,
      calculatedHeight = 200
    } = options;

    // Use dynamic height if enabled
    const finalPaperSize = dynamicHeight ? `79.5mm ${calculatedHeight}mm` : paperSize;
    const finalHeight = dynamicHeight ? calculatedHeight : 200;

    try {
      // Create a hidden iframe for silent printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Failed to create print document');
      }

      // Create print-friendly HTML optimized for 79.5mm thermal paper
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${finalHeight}mm</title>
            <meta charset="UTF-8">
            <meta name="paper-size" content="${finalPaperSize}">
            <style>
              @page {
                size: ${finalPaperSize} !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              * {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              
              html, body {
                width: 79.5mm !important;
                height: ${finalHeight}mm !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              
              body {
                font-family: 'Courier New', monospace !important;
                font-size: 17px !important;
                line-height: 1.15 !important;
                color: #000 !important;
                background: #fff !important;
                margin: 0 !important;
                padding: 3.75mm !important;
                font-weight: bold !important;
                width: 72mm !important;
                height: ${finalHeight - 7.5}mm !important;
              }
              
              .receipt-content {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                font-weight: bold !important;
                width: 100% !important;
                font-size: 17px !important;
                line-height: 1.15 !important;
              }
              
              @media print {
                @page {
                  size: ${finalPaperSize} !important;
                  margin: 0 !important;
                }
                
                body {
                  margin: 0 !important;
                  padding: 3.75mm !important;
                  width: 72mm !important;
                  font-size: 17px !important;
                  line-height: 1.15 !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt-content">${content}</div>
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 500);
                }, 200);
              };
            </script>
          </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(printHTML);
      iframeDoc.close();

      // Wait for the iframe to load and print
      return new Promise((resolve) => {
        iframe.onload = () => {
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch (e) {
              // Ignore errors when removing iframe
            }
            resolve(true);
          }, 1000);
        };
      });

    } catch (error) {
      console.error('Auto print failed:', error);
      return false;
    }
  }

  // Print receipt - main method for receipt printing
  async printReceipt(content: string, options: BrowserPrintOptions = {}): Promise<boolean> {
    try {
      return await this.printDirect(content, options);
    } catch (error) {
      console.error('Receipt printing failed:', error);
      return false;
    }
  }

  // Print with iframe - alias for printDirect for compatibility
  async printWithIframe(content: string, options: BrowserPrintOptions = {}): Promise<boolean> {
    try {
      return await this.printDirect(content, options);
    } catch (error) {
      console.error('Iframe printing failed:', error);
      return false;
    }
  }

  // Print with dialog - alias for printDirect for compatibility
  async printWithDialog(content: string, options: BrowserPrintOptions = {}): Promise<boolean> {
    try {
      return await this.printDirect(content, options);
    } catch (error) {
      console.error('Dialog printing failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const browserPrintService = new BrowserPrintService();