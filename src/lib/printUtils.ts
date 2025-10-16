import { directPrintService } from './directPrint';
import { browserPrintService } from './browserPrint';
import { webusbPrintService } from './webusbPrint';
import { BrowserThermalPrinter, FallbackPrintService } from './thermal-printer-browser';

export interface PrintOptions {
  method?: 'auto' | 'webusb' | 'browser' | 'direct';
  paperSize?: string;
  copies?: number;
  autoCut?: boolean;
  silent?: boolean;
  preview?: boolean;
  dynamicHeight?: boolean; // Enable dynamic height calculation
}

export class PrintUtils {
  private static thermalPrinter: BrowserThermalPrinter | null = null;

  /**
   * Calculate dynamic receipt height based on content
   */
  private static calculateReceiptHeight(order: any, franchiseDetails?: any): number {
    const items = order.items || [];
    
    // Base height measurements in mm
    const baseHeight = 20; // Header margin
    const logoHeight = 15; // Logo space
    const restaurantNameHeight = 8; // Restaurant name
    const addressHeight = franchiseDetails?.address ? 8 : 0; // Address
    const contactHeight = franchiseDetails?.phone ? 6 : 0; // Contact
    const dividerHeight = 2; // Divider line
    const orderInfoHeight = 10; // Order number and table
    const itemsHeaderHeight = 6; // Items column headers
    const itemRowHeight = 6; // Each item row
    const totalsHeight = 25; // Totals section (including dividers)
    const footerHeight = 15; // Footer section
    const bottomMargin = 10; // Bottom margin
    
    // Calculate total height
    let totalHeight = baseHeight + logoHeight + restaurantNameHeight + 
                     dividerHeight + orderInfoHeight + itemsHeaderHeight + 
                     totalsHeight + footerHeight + bottomMargin;
    
    // Add address and contact if present
    totalHeight += addressHeight + contactHeight;
    
    // Add height for each item
    totalHeight += items.length * itemRowHeight;
    
    // Add dividers between sections
    totalHeight += dividerHeight * 3; // Header, items, totals dividers
    
    // Add extra space for GST if applicable
    if (franchiseDetails?.gstPercentage > 0) {
      totalHeight += 6; // GST row height
    }
    
    // Ensure minimum height of 50mm and maximum of 300mm (standard thermal paper roll)
    return Math.max(50, Math.min(300, totalHeight));
  }

  /**
   * Initialize thermal printer with dynamic height
   */
  private static async initializeThermalPrinter(dynamicHeight: number = 200): Promise<boolean> {
    if (!this.thermalPrinter) {
      this.thermalPrinter = new BrowserThermalPrinter({
        width: 79.5,   // mm (3 inch) - fixed
        height: dynamicHeight, // mm - dynamic
        dpi: 203       // Standard thermal printer DPI
      });
    }

    try {
      const initialized = await this.thermalPrinter.initialize();
      if (initialized) {
        console.log(`✅ Thermal printer initialized successfully with dynamic height: ${dynamicHeight}mm`);
      }
      return initialized;
    } catch (error) {
      console.warn('⚠️ Thermal printer initialization failed:', error);
      return false;
    }
  }

  /**
   * Smart print function that tries different methods in order
   * 1. Direct thermal printer (ESC/POS)
   * 2. WebUSB (direct thermal printer communication)
   * 3. Browser silent print
   * 4. Browser direct print
   * 5. Browser print with dialog
   */
  static async smartPrint(content: string, options: PrintOptions = {}, orderData?: any, franchiseDetails?: any): Promise<boolean> {
    const {
      method = 'auto',
      paperSize = '79.5mm 200mm',
      copies = 1,
      autoCut = true,
      silent = true,
      preview = false,
      dynamicHeight = true
    } = options;

    // Calculate dynamic height if enabled and order data is provided
    let calculatedHeight = 200; // Default height
    if (dynamicHeight && orderData) {
      calculatedHeight = this.calculateReceiptHeight(orderData, franchiseDetails);
      console.log(`📏 Calculated dynamic receipt height: ${calculatedHeight}mm`);
    }

    try {
      // If preview is requested, always show dialog
      if (preview) {
        await browserPrintService.printWithDialog(content, { dynamicHeight, calculatedHeight });
        return true;
      }

      // If specific method is requested
      if (method !== 'auto') {
        return await this.printWithMethod(content, method, {
          paperSize,
          copies,
          autoCut,
          silent,
          dynamicHeight,
          calculatedHeight
        });
      }

      // Auto mode: try methods in order of preference
      
      // 1. Try direct thermal printer first (ESC/POS)
      try {
        const thermalReady = await this.initializeThermalPrinter(calculatedHeight);
        if (thermalReady && this.thermalPrinter) {
          await this.thermalPrinter.printContent(content);
          await this.thermalPrinter.cleanup();
          console.log('✅ Printed via direct thermal printer (ESC/POS)');
          return true;
        }
      } catch (thermalError) {
        console.warn('⚠️ Direct thermal printing failed:', thermalError);
      }

      // 2. Try WebUSB (second best for thermal printers)
      if (webusbPrintService.isSupported()) {
        try {
          const webusbSuccess = await webusbPrintService.printViaWebUSB(content, {
            copies,
            autoCut,
            dynamicHeight,
            calculatedHeight
          });
          
          if (webusbSuccess) {
            console.log('✅ Printed via WebUSB (direct thermal communication)');
            return true;
          }
        } catch (webusbError) {
          console.warn('⚠️ WebUSB printing failed:', webusbError);
        }
      }

      // 3. Try fallback direct print (optimized iframe)
      try {
        await FallbackPrintService.printWithDirectPrint(content, { dynamicHeight, calculatedHeight });
        console.log('✅ Printed via fallback direct print');
        return true;
      } catch (fallbackError) {
        console.warn('⚠️ Fallback direct print failed:', fallbackError);
      }

      // 4. Try browser silent printing
      if (silent) {
        try {
          const silentSuccess = await browserPrintService.printSilent(content, {
            paperSize: dynamicHeight ? `79.5mm ${calculatedHeight}mm` : paperSize,
            copies,
            dynamicHeight,
            calculatedHeight
          });
          
          if (silentSuccess) {
            console.log('✅ Printed via browser silent printing');
            return true;
          }
        } catch (silentError) {
          console.warn('⚠️ Silent printing failed:', silentError);
        }
      }

      // 5. Try browser direct printing
      try {
        const directSuccess = await browserPrintService.printDirect(content, {
          paperSize: dynamicHeight ? `79.5mm ${calculatedHeight}mm` : paperSize,
          copies,
          dynamicHeight,
          calculatedHeight
        });
        
        if (directSuccess) {
          console.log('✅ Printed via browser direct printing');
          return true;
        }
      } catch (directError) {
        console.warn('⚠️ Direct printing failed:', directError);
      }

      // 6. Fallback to browser print with dialog
      console.log('📄 Falling back to browser print with dialog');
      await browserPrintService.printWithDialog(content, { dynamicHeight, calculatedHeight });
      return true;

    } catch (error) {
      console.error('❌ All printing methods failed:', error);
      throw error;
    }
  }

  /**
   * Print with a specific method
   */
  private static async printWithMethod(
    content: string, 
    method: string, 
    options: any
  ): Promise<boolean> {
    switch (method) {
      case 'webusb':
        if (!webusbPrintService.isSupported()) {
          throw new Error('WebUSB is not supported in this browser');
        }
        return await webusbPrintService.printViaWebUSB(content, options);

      case 'browser':
        if (options.silent) {
          return await browserPrintService.printSilent(content, options);
        } else {
          return await browserPrintService.printDirect(content, options);
        }

      case 'direct':
        return await directPrintService.printReceipt(content, options);

      default:
        throw new Error(`Unknown print method: ${method}`);
    }
  }

  /**
   * Check what printing methods are available
   */
  static async getAvailableMethods(): Promise<{
    webusb: boolean;
    browser: boolean;
    direct: boolean;
    recommended: string[];
  }> {
    const webusbSupported = webusbPrintService.isSupported();
    const webusbDevices = webusbSupported ? await webusbPrintService.getConnectedDevices() : [];
    
    return {
      webusb: webusbSupported && webusbDevices.length > 0,
      browser: true, // Always available in modern browsers
      direct: directPrintService.hasConfiguredPrinters(),
      recommended: [
        ...(webusbSupported && webusbDevices.length > 0 ? ['webusb'] : []),
        'browser',
        ...(directPrintService.hasConfiguredPrinters() ? ['direct'] : [])
      ]
    };
  }

  /**
   * Get connected USB printers
   */
  static async getUSBPrinters(): Promise<any[]> {
    if (!webusbPrintService.isSupported()) {
      return [];
    }

    try {
      return await webusbPrintService.getConnectedDevices();
    } catch (error) {
      console.error('Failed to get USB printers:', error);
      return [];
    }
  }

  /**
   * Test print with sample content (Centered design)
   */
  static async testPrint(options: PrintOptions = {}, franchiseDetails?: any): Promise<boolean> {
    // Helper function to center text within 58 characters
    const centerText = (text: string, width = 58) => {
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(Math.max(0, padding)) + text;
    };
    
    // Helper function to format price right-aligned
    const formatPrice = (price: number) => {
      const priceStr = `₹${price.toFixed(2)}`;
      return priceStr.padStart(20);
    };

    // Get franchise details or use defaults
    const restaurantName = franchiseDetails?.name || 'FORKFLOW POS';
    const address = franchiseDetails?.address || '123 Main Street, City';
    const contact = franchiseDetails?.phone || '+91 98765 43210';
    const gstNumber = franchiseDetails?.gstNumber || '5%';
    
    const sampleContent = `
${centerText('🍽️')}
${centerText(restaurantName)}
${'='.repeat(58)}
${centerText(address)}
${centerText(`Phone: ${contact}`)}
${centerText(`GST: ${gstNumber}`)}
${'='.repeat(58)}
${'ORDER #TEST-001'.padEnd(40)}${new Date().toLocaleTimeString().padStart(18)}
${new Date().toLocaleDateString().padEnd(58)}
${'TABLE: TEST-01'}
${'='.repeat(58)}
${'Item'.padEnd(35)}${'Qty'.padStart(8)}${'Rate'.padStart(8)}${'Amount'.padStart(7)}
${'='.repeat(58)}
${'Test Item 1'.padEnd(35)}${'2'.padStart(8)}${'150.00'.padStart(8)}${formatPrice(300)}
${'Test Item 2'.padEnd(35)}${'1'.padStart(8)}${'200.00'.padStart(8)}${formatPrice(200)}
${'Test Item 3'.padEnd(35)}${'3'.padStart(8)}${'100.00'.padStart(8)}${formatPrice(300)}
${'='.repeat(58)}
${'Subtotal'.padEnd(40)}${formatPrice(800)}
${'GST'.padEnd(40)}${formatPrice(40)}
${'-'.repeat(58)}
${'TOTAL'.padEnd(40)}${formatPrice(840)}
${'='.repeat(58)}
${centerText('Payment Method: CASH')}
${centerText('STATUS: PAID')}
${'='.repeat(58)}
${centerText('Thank you for dining with us!')}
${centerText('Please visit again')}
${centerText('This is a computer-generated receipt')}
${centerText('Powered by FORKFLOW POS')}


    `.trim();

    return await this.smartPrint(sampleContent, {
      ...options,
      preview: false
    });
  }

  /**
   * Format receipt content for thermal printer (Centered design format)
   */
  static formatReceiptContent(order: any, franchiseDetails?: any): string {
    const items = order.items || [];
    
    // Get franchise details or use defaults
    const restaurantName = franchiseDetails?.name || 'FORKFLOW POS';
    const address = franchiseDetails?.address || 'Restaurant Address';
    const contact = franchiseDetails?.phone || 'Contact Number';
    const gstNumber = franchiseDetails?.gstNumber || null;
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const gstAmount = order.gstAmount || 0;
    const total = subtotal + gstAmount;
    
    // Helper function to center text within 58 characters
    const centerText = (text: string, width = 58) => {
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(Math.max(0, padding)) + text;
    };
    
    // Helper function to format price right-aligned
    const formatPrice = (price: number) => {
      const priceStr = `₹${price.toFixed(2)}`;
      return priceStr.padStart(20);
    };
    
    let content = '\n';
    
    // Logo and Header
    content += centerText('🍽️') + '\n';
    content += centerText(restaurantName) + '\n';
    content += '='.repeat(58) + '\n';
    content += centerText(address) + '\n';
    content += centerText(`Tel: ${contact}`) + '\n';
    if (gstNumber) {
      content += centerText(`GSTIN: ${gstNumber}`) + '\n';
    }
    content += '='.repeat(58) + '\n';
    
    // Order info
    content += `ORDER #${order.orderNumber || 'N/A'}`.padEnd(40) + new Date().toLocaleTimeString().padStart(18) + '\n';
    content += new Date().toLocaleDateString().padEnd(58) + '\n';
    if (order.tableNumber) {
      content += `TABLE: ${order.tableNumber}` + '\n';
    }
    content += '='.repeat(58) + '\n';
    
    // Items header
    content += 'Item'.padEnd(35) + 'Qty'.padStart(8) + 'Rate'.padStart(8) + 'Amount'.padStart(7) + '\n';
    content += '='.repeat(58) + '\n';
    
    // Add items
    items.forEach((item: any) => {
      const itemName = item.name || 'Unknown Item';
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const itemTotal = price * quantity;
      const truncatedName = itemName.length > 32 ? itemName.substring(0, 32) : itemName;
      
      content += truncatedName.padEnd(35) + 
                  quantity.toString().padStart(8) + 
                  price.toFixed(2).padStart(8) + 
                  formatPrice(itemTotal) + '\n';
    });
    
    content += '='.repeat(58) + '\n';
    
    // Totals
    content += 'Subtotal'.padEnd(40) + formatPrice(subtotal) + '\n';
    
    if (order.cgst > 0) {
      content += `CGST (${order.cgstPercentage || 2.5}%)`.padEnd(40) + formatPrice(order.cgst) + '\n';
    }
    
    if (order.sgst > 0) {
      content += `SGST (${order.sgstPercentage || 2.5}%)`.padEnd(40) + formatPrice(order.sgst) + '\n';
    }
    
    if (gstAmount > 0 && !order.cgst && !order.sgst) {
      content += `GST`.padEnd(40) + formatPrice(gstAmount) + '\n';
    }
    
    content += '-'.repeat(58) + '\n';
    content += 'TOTAL'.padEnd(40) + formatPrice(total) + '\n';
    content += '='.repeat(58) + '\n';
    
    // Payment info
    content += centerText(`Payment Method: ${(order.paymentMethod || 'Cash').toUpperCase()}`) + '\n';
    content += centerText('STATUS: PAID') + '\n';
    content += '='.repeat(58) + '\n';
    
    // Footer
    content += centerText('Thank you for dining with us!') + '\n';
    content += centerText('Please visit again') + '\n';
    content += centerText('This is a computer-generated receipt') + '\n';
    content += centerText('Powered by FORKFLOW POS') + '\n';
    content += '\n\n\n'; // Extra space for cutting
    
    return content;
  }
}

// Export convenience functions
export const printReceipt = (content: string, options?: PrintOptions, orderData?: any, franchiseDetails?: any) => 
  PrintUtils.smartPrint(content, options, orderData, franchiseDetails);
export const testPrint = (options?: PrintOptions, franchiseDetails?: any) => PrintUtils.testPrint(options, franchiseDetails);
export const getPrintMethods = () => PrintUtils.getAvailableMethods();
export const getUSBPrinters = () => PrintUtils.getUSBPrinters();
export const formatReceipt = (order: any, franchiseDetails?: any) => PrintUtils.formatReceiptContent(order, franchiseDetails);

// Export the dynamic height calculation function for testing
export const calculateReceiptHeight = (order: any, franchiseDetails?: any) => {
  const items = order.items || [];
  
  // Base height measurements in mm
  const baseHeight = 20; // Header margin
  const logoHeight = 15; // Logo space
  const restaurantNameHeight = 8; // Restaurant name
  const addressHeight = franchiseDetails?.address ? 8 : 0; // Address
  const contactHeight = franchiseDetails?.phone ? 6 : 0; // Contact
  const dividerHeight = 2; // Divider line
  const orderInfoHeight = 10; // Order number and table
  const itemsHeaderHeight = 6; // Items column headers
  const itemRowHeight = 6; // Each item row
  const totalsHeight = 25; // Totals section (including dividers)
  const footerHeight = 15; // Footer section
  const bottomMargin = 10; // Bottom margin
  
  // Calculate total height
  let totalHeight = baseHeight + logoHeight + restaurantNameHeight + 
                   dividerHeight + orderInfoHeight + itemsHeaderHeight + 
                   totalsHeight + footerHeight + bottomMargin;
  
  // Add address and contact if present
  totalHeight += addressHeight + contactHeight;
  
  // Add height for each item
  totalHeight += items.length * itemRowHeight;
  
  // Add dividers between sections
  totalHeight += dividerHeight * 3; // Header, items, totals dividers
  
  // Add extra space for GST if applicable
  if (franchiseDetails?.gstPercentage > 0) {
    totalHeight += 6; // GST row height
  }
  
  // Ensure minimum height of 50mm and maximum of 300mm (standard thermal paper roll)
  return Math.max(50, Math.min(300, totalHeight));
};