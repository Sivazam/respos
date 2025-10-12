export interface ThermalPrinterConfig {
  width: number;  // mm
  height: number; // mm
  dpi: number;    // dots per inch
}

export class BrowserThermalPrinter {
  private config: ThermalPrinterConfig;

  constructor(config: ThermalPrinterConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    try {
      // Browser-based thermal printer simulation
      console.log('🔥 Initializing browser thermal printer...');
      return true;
    } catch (error) {
      console.error('Failed to initialize browser thermal printer:', error);
      return false;
    }
  }

  async printContent(content: string): Promise<void> {
    if (!content) {
      throw new Error('No content to print');
    }

    try {
      // Create a print-friendly version of the content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      // Write the content with thermal printer optimized styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Thermal Print - ${this.config.height}mm</title>
          <meta charset="UTF-8">
          <meta name="paper-size" content="${this.config.width}mm ${this.config.height}mm">
          <style>
            /* Force paper size with multiple techniques */
            @page {
              size: ${this.config.width}mm ${this.config.height}mm !important;
              margin: 2mm !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page :left {
              size: ${this.config.width}mm ${this.config.height}mm !important;
            }
            
            @page :right {
              size: ${this.config.width}mm ${this.config.height}mm !important;
            }
            
            @page :first {
              size: ${this.config.width}mm ${this.config.height}mm !important;
            }
            
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
            
            body {
              font-family: 'Courier New', monospace !important;
              font-size: 12px !important;
              line-height: 1.2 !important;
              margin: 0 !important;
              padding: 2mm !important;
              width: ${this.config.width - 4}mm !important;
              height: ${this.config.height - 4}mm !important;
              min-height: ${this.config.height - 4}mm !important;
              max-height: ${this.config.height - 4}mm !important;
              overflow: hidden !important;
              background: white !important;
              box-sizing: border-box !important;
              position: relative !important;
              display: block !important;
            }
            
            .receipt-header {
              text-align: center !important;
              margin-bottom: 8px !important;
            }
            
            .logo img {
              max-width: 60px !important;
              max-height: 60px !important;
            }
            
            .restaurant-name h1 {
              font-size: 16px !important;
              font-weight: bold !important;
              margin: 4px 0 !important;
              text-align: center !important;
            }
            
            .address p, .contact p {
              font-size: 10px !important;
              margin: 2px 0 !important;
              text-align: center !important;
            }
            
            .order-info {
              margin: 8px 0 !important;
            }
            
            .order-number, .table-number {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              margin: 2px 0 !important;
            }
            
            .label {
              font-weight: bold !important;
            }
            
            .items-header {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              font-weight: bold !important;
              margin: 4px 0 !important;
            }
            
            .item-header {
              flex: 2 !important;
            }
            
            .qty-header {
              flex: 0.5 !important;
              text-align: center !important;
            }
            
            .price-header {
              flex: 1 !important;
              text-align: right !important;
            }
            
            .item-row {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 10px !important;
              margin: 2px 0 !important;
            }
            
            .item-name {
              flex: 2 !important;
            }
            
            .item-qty {
              flex: 0.5 !important;
              text-align: center !important;
            }
            
            .item-price {
              flex: 1 !important;
              text-align: right !important;
            }
            
            .totals-section {
              margin: 8px 0 !important;
            }
            
            .total-row {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              margin: 2px 0 !important;
            }
            
            .grand-total {
              font-weight: bold !important;
              font-size: 12px !important;
            }
            
            .receipt-footer {
              text-align: center !important;
              margin-top: 8px !important;
            }
            
            .receipt-footer p {
              font-size: 9px !important;
              margin: 2px 0 !important;
            }
            
            .divider {
              border-top: 1px solid #000 !important;
              margin: 4px 0 !important;
            }
            
            /* Print-specific styles with maximum specificity */
            @media print {
              * {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
              }
              
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                height: auto !important;
                overflow: hidden !important;
                position: relative !important;
              }
              
              @page {
                size: ${this.config.width}mm ${this.config.height}mm !important;
                margin: 2mm !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              @page :left {
                size: ${this.config.width}mm ${this.config.height}mm !important;
              }
              
              @page :right {
                size: ${this.config.width}mm ${this.config.height}mm !important;
              }
              
              @page :first {
                size: ${this.config.width}mm ${this.config.height}mm !important;
              }
              
              html, body {
                width: ${this.config.width}mm !important;
                height: ${this.config.height}mm !important;
                min-height: ${this.config.height}mm !important;
                max-height: ${this.config.height}mm !important;
                overflow: hidden !important;
                position: relative !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
              }
            }
            
            /* Add print hint */
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
          <div class="print-hint">Paper Size: ${this.config.width}mm × ${this.config.height}mm</div>
          ${content}
          <script>
            window.onload = function() {
              console.log('📏 Thermal print size: ${this.config.width}mm × ${this.config.height}mm');
              document.title = 'Thermal_${this.config.height}mm_${Date.now()}';
            };
          </script>
        </body>
        </html>
      `);

      printWindow.document.close();

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger print
      printWindow.print();

      // Close window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);

    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Browser cleanup if needed
    console.log('🧹 Browser thermal printer cleaned up');
  }
}

// Fallback print service for when direct printer access fails
export class FallbackPrintService {
  static async printWithDirectPrint(content: string, options: { dynamicHeight?: boolean; calculatedHeight?: number } = {}): Promise<void> {
    try {
      const { dynamicHeight = false, calculatedHeight = 200 } = options;
      
      // Create a hidden iframe for direct printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      // Use dynamic height if enabled, otherwise use default
      const paperHeight = dynamicHeight ? calculatedHeight : 200;

      // Write content with optimized print styles
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fallback Thermal Print - ${paperHeight}mm</title>
          <meta charset="UTF-8">
          <meta name="paper-size" content="79.5mm ${paperHeight}mm">
          <style>
            /* Force paper size with multiple techniques */
            @page {
              size: 79.5mm ${paperHeight}mm !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page :left {
              size: 79.5mm ${paperHeight}mm !important;
            }
            
            @page :right {
              size: 79.5mm ${paperHeight}mm !important;
            }
            
            @page :first {
              size: 79.5mm ${paperHeight}mm !important;
            }
            
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
            
            body {
              font-family: 'Courier New', monospace !important;
              font-size: 12px !important;
              line-height: 1.2 !important;
              margin: 0 !important;
              padding: 2mm !important;
              width: 75.5mm !important;
              height: ${paperHeight - 4}mm !important;
              min-height: ${paperHeight - 4}mm !important;
              max-height: ${paperHeight - 4}mm !important;
              overflow: hidden !important;
              background: white !important;
              box-sizing: border-box !important;
              position: relative !important;
              display: block !important;
            }
            
            .receipt-header {
              text-align: center !important;
              margin-bottom: 8px !important;
            }
            
            .logo img {
              max-width: 60px !important;
              max-height: 60px !important;
            }
            
            .restaurant-name h1 {
              font-size: 16px !important;
              font-weight: bold !important;
              margin: 4px 0 !important;
              text-align: center !important;
            }
            
            .address p, .contact p {
              font-size: 10px !important;
              margin: 2px 0 !important;
              text-align: center !important;
            }
            
            .order-info {
              margin: 8px 0 !important;
            }
            
            .order-number, .table-number {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              margin: 2px 0 !important;
            }
            
            .label {
              font-weight: bold !important;
            }
            
            .items-header {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              font-weight: bold !important;
              margin: 4px 0 !important;
            }
            
            .item-header {
              flex: 2 !important;
            }
            
            .qty-header {
              flex: 0.5 !important;
              text-align: center !important;
            }
            
            .price-header {
              flex: 1 !important;
              text-align: right !important;
            }
            
            .item-row {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 10px !important;
              margin: 2px 0 !important;
            }
            
            .item-name {
              flex: 2 !important;
            }
            
            .item-qty {
              flex: 0.5 !important;
              text-align: center !important;
            }
            
            .item-price {
              flex: 1 !important;
              text-align: right !important;
            }
            
            .totals-section {
              margin: 8px 0 !important;
            }
            
            .total-row {
              display: flex !important;
              justify-content: space-between !important;
              font-size: 11px !important;
              margin: 2px 0 !important;
            }
            
            .grand-total {
              font-weight: bold !important;
              font-size: 12px !important;
            }
            
            .receipt-footer {
              text-align: center !important;
              margin-top: 8px !important;
            }
            
            .receipt-footer p {
              font-size: 9px !important;
              margin: 2px 0 !important;
            }
            
            .divider {
              border-top: 1px solid #000 !important;
              margin: 4px 0 !important;
            }
            
            /* Print-specific styles with maximum specificity */
            @media print {
              * {
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
              }
              
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                height: auto !important;
                overflow: hidden !important;
                position: relative !important;
              }
              
              @page {
                size: 79.5mm ${paperHeight}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              @page :left {
                size: 79.5mm ${paperHeight}mm !important;
              }
              
              @page :right {
                size: 79.5mm ${paperHeight}mm !important;
              }
              
              @page :first {
                size: 79.5mm ${paperHeight}mm !important;
              }
              
              html, body {
                width: 79.5mm !important;
                height: ${paperHeight}mm !important;
                min-height: ${paperHeight}mm !important;
                max-height: ${paperHeight}mm !important;
                overflow: hidden !important;
                position: relative !important;
                page-break-after: avoid !important;
                page-break-before: avoid !important;
              }
            }
            
            /* Add print hint */
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
          <div class="print-hint">Paper Size: 79.5mm × ${paperHeight}mm</div>
          ${content}
          <script>
            window.onload = function() {
              console.log('📏 Fallback print size: 79.5mm × ${paperHeight}mm');
              document.title = 'Fallback_${paperHeight}mm_${Date.now()}';
            };
          </script>
        </body>
        </html>
      `);

      iframeDoc.close();

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Print directly without dialog
      if (iframe.contentWindow) {
        iframe.contentWindow.print();
      }

      // Clean up
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);

    } catch (error) {
      console.error('Fallback print failed:', error);
      throw error;
    }
  }
}