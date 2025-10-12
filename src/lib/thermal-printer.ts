import { Printer } from 'escpos';
import USB from 'escpos-usb';

export interface ThermalPrinterConfig {
  width: number;  // mm
  height: number; // mm
  dpi: number;    // dots per inch
}

export class ThermalPrinter {
  private printer: Printer | null = null;
  private config: ThermalPrinterConfig;

  constructor(config: ThermalPrinterConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    try {
      // Try to find USB thermal printer
      const device = new USB();
      this.printer = new Printer(device);
      
      // Initialize printer with ESC/POS commands
      await this.initializePrinter();
      return true;
    } catch (error) {
      console.error('Failed to initialize thermal printer:', error);
      return false;
    }
  }

  private async initializePrinter(): Promise<void> {
    if (!this.printer) return;

    // ESC/POS initialization commands
    this.printer
      .font('a')           // Font A (standard)
      .align('ct')         // Center alignment
      .style('normal')     // Normal text style
      .size(0, 0)          // Standard size
      .lineSpace(60);      // Line spacing
  }

  async printContent(content: string): Promise<void> {
    if (!this.printer) {
      throw new Error('Printer not initialized');
    }

    try {
      // Convert HTML content to ESC/POS commands
      const escposCommands = this.convertToEscpos(content);
      
      // Send commands to printer
      this.printer.text(escposCommands);
      
      // Cut paper (if supported)
      this.printer.cut();
      
      // Execute print
      this.printer.flush();
    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  }

  private convertToEscpos(htmlContent: string): string {
    // Parse HTML and convert to ESC/POS commands
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    let escposText = '';
    
    // Process title
    const title = doc.querySelector('h1');
    if (title) {
      escposText += this.centerText(title.textContent || '') + '\n';
      escposText += '\n';
    }

    // Process subtitle
    const subtitle = doc.querySelector('h2');
    if (subtitle) {
      escposText += this.centerText(subtitle.textContent || '') + '\n';
      escposText += '\n';
    }

    // Process dividers
    const dividers = doc.querySelectorAll('.divider');
    dividers.forEach(() => {
      escposText += '--------------------------------\n';
    });

    // Process sections
    const sections = doc.querySelectorAll('.print-section');
    sections.forEach(section => {
      const label = section.querySelector('.label');
      const value = section.querySelector('.value');
      
      if (label && value) {
        const labelText = label.textContent || '';
        const valueText = value.textContent || '';
        escposText += `${labelText.padEnd(15)} ${valueText.padStart(20)}\n`;
      }
    });

    // Process h3 headers
    const headers = doc.querySelectorAll('h3');
    headers.forEach(header => {
      escposText += `\n${header.textContent || ''}\n`;
      escposText += '--------------------------------\n';
    });

    // Process table
    const table = doc.querySelector('table');
    if (table) {
      escposText += this.formatTable(table);
    }

    // Process footer
    const footer = doc.querySelector('.print-footer');
    if (footer) {
      const paragraphs = footer.querySelectorAll('p');
      paragraphs.forEach(p => {
        escposText += '\n' + this.centerText(p.textContent || '') + '\n';
      });
    }

    return escposText;
  }

  private formatText(text: string, options: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: 'normal' | 'double' | 'triple';
  }): string {
    let formatted = text;
    
    // Add alignment
    if (options.align === 'center') {
      formatted = this.centerText(formatted);
    }
    
    // Add line breaks
    formatted += '\n\n';
    
    return formatted;
  }

  private centerText(text: string): string {
    const maxWidth = 32; // Characters for 72mm width at standard font
    const padding = Math.max(0, Math.floor((maxWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private formatTable(table: Element): string {
    let tableText = '\n';
    
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const rowData = Array.from(cells).map(cell => cell.textContent || '');
      tableText += this.formatTableRow(rowData);
    });
    
    return tableText + '\n';
  }

  private formatTableRow(cells: string[]): string {
    const cellWidth = Math.floor(32 / cells.length); // Distribute width evenly
    return cells.map(cell => 
      cell.padEnd(cellWidth).substring(0, cellWidth)
    ).join(' ') + '\n';
  }

  async cleanup(): Promise<void> {
    if (this.printer) {
      this.printer.clear();
      this.printer = null;
    }
  }
}

// Fallback print service for when direct printer access fails
export class FallbackPrintService {
  static async printWithDirectPrint(content: string): Promise<void> {
    try {
      // Create a hidden iframe for direct printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Could not access iframe document');
      }

      // Write content with optimized print styles
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Thermal Print</title>
          <style>
            @page {
              size: 79.5mm 200mm;
              margin: 0;
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 18px;
              line-height: 1.4;
              margin: 0;
              padding: 2mm;
              width: 75.5mm;
              height: 196mm;
              overflow: hidden;
              background: white;
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 3mm;
            }
            
            .print-header h1 {
              font-size: 22px;
              font-weight: bold;
              margin: 0 0 2mm 0;
            }
            
            .print-header h2 {
              font-size: 16px;
              font-weight: normal;
              margin: 0 0 3mm 0;
              font-style: italic;
            }
            
            .print-section {
              margin: 2mm 0;
              display: flex;
              justify-content: space-between;
            }
            
            .print-section .label {
              font-weight: bold;
              text-transform: uppercase;
              font-size: 14px;
            }
            
            .print-section .value {
              font-weight: normal;
              font-size: 14px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 3mm 0;
              font-size: 12px;
            }
            
            th, td {
              border: 1px solid #000;
              padding: 1mm;
              text-align: left;
            }
            
            th {
              background: #f0f0f0;
              font-weight: bold;
            }
            
            .divider {
              border-top: 2px solid #000;
              margin: 3mm 0;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${content}
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