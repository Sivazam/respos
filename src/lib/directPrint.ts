import { printerManager, PrinterConfig } from './printerConfig';
import { browserPrintService } from './browserPrint';
import { webusbPrintService } from './webusbPrint';

export interface DirectPrintOptions {
  printerId?: string;
  skipPreview?: boolean;
  copies?: number;
  autoCut?: boolean;
}

export class DirectPrintService {
  private defaultPrinterId: string | null = null;

  constructor() {
    this.loadDefaultPrinter();
  }

  // Load default printer from localStorage
  private loadDefaultPrinter(): void {
    try {
      const defaultPrinter = localStorage.getItem('default_printer_id');
      if (defaultPrinter) {
        this.defaultPrinterId = defaultPrinter;
      }
    } catch (error) {
      console.error('Failed to load default printer:', error);
    }
  }

  // Set default printer
  setDefaultPrinter(printerId: string): void {
    this.defaultPrinterId = printerId;
    localStorage.setItem('default_printer_id', printerId);
  }

  // Get default printer
  getDefaultPrinter(): string | null {
    return this.defaultPrinterId;
  }

  // Print receipt directly without preview
  async printReceipt(content: string, options: DirectPrintOptions = {}): Promise<boolean> {
    const {
      printerId = this.defaultPrinterId,
      copies = 1
    } = options;

    try {
      if (!printerId) {
        console.warn('No printer configured, falling back to browser print');
        await this.printWithBrowser(content);
        return true;
      }

      const printer = printerManager.getPrinter(printerId);
      if (!printer) {
        console.warn('Printer not found, falling back to browser print');
        await this.printWithBrowser(content);
        return true;
      }

      // Handle USB printers differently
      if (printer.ip === 'usb') {
        try {
          // First try WebUSB for direct thermal printer communication
          if (webusbPrintService.isSupported()) {
            try {
              const webusbSuccess = await webusbPrintService.printViaWebUSB(content, {
                vendorId: printer.vendorId,
                productId: printer.productId,
                copies: copies,
                autoCut: options.autoCut !== false
              });
              
              if (webusbSuccess) {
                return true;
              }
            } catch (webusbError) {
              console.warn('WebUSB printing failed, falling back to browser print:', webusbError);
            }
          }
          
          // Fallback to browser print with silent printing
          for (let i = 0; i < copies; i++) {
            const success = await browserPrintService.printSilent(content, {
              paperSize: '79.5mm 200mm',
              copies: 1
            });
            
            if (!success) {
              // If silent printing fails, try direct printing
              const directSuccess = await browserPrintService.printDirect(content, {
                paperSize: '79.5mm 200mm',
                copies: 1
              });
              
              if (!directSuccess) {
                throw new Error(`Failed to print copy ${i + 1}`);
              }
            }
            
            // Small delay between copies
            if (i < copies - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          return true;
        } catch (error) {
          console.error('USB printing failed, falling back to browser print:', error);
          await this.printWithBrowser(content);
          return true;
        }
      }

      // Test printer connection first for network printers
      const isConnected = await printerManager.testConnection(printerId);
      if (!isConnected) {
        console.warn('Printer is not connected, falling back to browser print');
        await this.printWithBrowser(content);
        return true;
      }

      try {
        // Print specified number of copies
        for (let i = 0; i < copies; i++) {
          const success = await printerManager.printDirect(printerId, content);
          if (!success) {
            throw new Error(`Failed to print copy ${i + 1}`);
          }
          
          // Small delay between copies
          if (i < copies - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        return true;
      } catch (error) {
        console.error('Direct printing failed, falling back to browser print:', error);
        await this.printWithBrowser(content);
        return true;
      }
    } catch (error) {
      console.error('All printing methods failed:', error);
      // Final fallback to browser print
      try {
        await this.printWithBrowser(content);
        return true;
      } catch (fallbackError) {
        console.error('Browser print fallback also failed:', fallbackError);
        throw error;
      }
    }
  }

  // Fallback to browser print if direct printing fails
  async printWithBrowser(content: string): Promise<void> {
    try {
      await browserPrintService.printWithDialog(content);
    } catch (error) {
      // If browser print service fails, try the old method
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window. Please allow popups.');
      }

      // Create print-friendly HTML optimized for 79.5mm x 200mm thermal paper
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt Print</title>
            <style>
              @page {
                size: 79.5mm 200mm;
                margin: 0;
                padding: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              html, body {
                width: 79.5mm;
                height: 200mm;
                overflow: hidden;
                margin: 0;
                padding: 0;
              }
              
              body {
                font-family: 'Courier New', monospace;
                font-size: 17px;
                line-height: 1.15;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 3.75mm;
                font-weight: bold;
                width: 72mm;
                height: 192.5mm;
              }
              
              .receipt-content {
                white-space: pre-wrap;
                word-wrap: break-word;
                font-weight: bold;
                width: 100%;
                height: 100%;
                font-size: 17px;
                line-height: 1.15;
              }
              
              .header {
                font-size: 19px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 1mm;
              }
              
              .total {
                font-size: 18px;
                font-weight: bold;
              }
              
              .small {
                font-size: 15px;
              }
              
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                  width: 79.5mm;
                  height: 200mm;
                  overflow: hidden;
                }
                
                @page {
                  size: 79.5mm 200mm;
                  margin: 0;
                  padding: 0;
                }
                
                body {
                  margin: 0;
                  padding: 3.75mm;
                  width: 72mm;
                  height: 192.5mm;
                  font-size: 17px;
                  line-height: 1.15;
                }
                
                .receipt-content {
                  width: 100%;
                  height: 100%;
                  font-size: 17px;
                  line-height: 1.15;
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
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
    }
  }

  // Smart print - tries direct printing first, falls back to browser
  async smartPrint(content: string, options: DirectPrintOptions = {}): Promise<boolean> {
    try {
      // Try direct printing first
      if (options.skipPreview !== false) {
        return await this.printReceipt(content, options);
      }
    } catch (error) {
      console.warn('Direct printing failed, falling back to browser print:', error);
    }

    // Fallback to browser print
    try {
      await this.printWithBrowser(content);
      return true;
    } catch (error) {
      console.error('Browser print also failed:', error);
      throw error;
    }
  }

  // Get available printers
  getAvailablePrinters() {
    return printerManager.getAllPrinters();
  }

  // Detect and add USB printers
  async detectUSBPrinters(): Promise<PrinterConfig[]> {
    const printers: PrinterConfig[] = [];
    
    try {
      // First try WebUSB detection
      if (webusbPrintService.isSupported()) {
        try {
          const connectedDevices = await webusbPrintService.getConnectedDevices();
          for (const device of connectedDevices) {
            const usbPrinter: PrinterConfig = {
              id: `webusb_${device.vendorId}_${device.productId}`,
              name: `USB Thermal Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
              ip: 'usb',
              port: 9100,
              paperWidth: 79.5,
              vendorId: device.vendorId,
              productId: device.productId,
              isDefault: false,
              isOnline: true,
              type: 'usb' as any,
              model: device.productName || 'USB Thermal Printer'
            };
            printers.push(usbPrinter);
          }
        } catch (webusbError) {
          console.warn('WebUSB detection failed:', webusbError);
        }
      }
      
      // Fallback to legacy USB detection
      const usbPrinter = await printerManager.requestUSBPrinter();
      if (usbPrinter) {
        printers.push(usbPrinter);
      }
    } catch (error) {
      console.error('USB printer detection failed:', error);
    }
    
    return printers;
  }

  // Check if any printers are configured
  hasConfiguredPrinters(): boolean {
    try {
      return printerManager.getAllPrinters().length > 0;
    } catch (error) {
      console.error('Failed to check configured printers:', error);
      return false;
    }
  }
}

// Export singleton instance
export const directPrintService = new DirectPrintService();

// Utility function for quick printing
export const printReceiptDirect = async (content: string, options?: DirectPrintOptions): Promise<void> => {
  try {
    await directPrintService.smartPrint(content, options);
    console.log('Receipt printed successfully');
  } catch (error) {
    console.error('Failed to print receipt:', error);
    throw error;
  }
};