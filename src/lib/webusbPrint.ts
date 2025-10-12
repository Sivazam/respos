export interface WebUSBPrintOptions {
  vendorId?: number;
  productId?: number;
  autoCut?: boolean;
  copies?: number;
  dynamicHeight?: boolean;
  calculatedHeight?: number;
}

export class WebUSBPrintService {
  private static readonly ESC_POS = {
    INIT: [0x1B, 0x40], // Initialize printer
    ALIGN_CENTER: [0x1B, 0x61, 0x01], // Center align
    ALIGN_LEFT: [0x1B, 0x61, 0x00], // Left align
    ALIGN_RIGHT: [0x1B, 0x61, 0x02], // Right align
    BOLD_ON: [0x1B, 0x45, 0x01], // Bold on
    BOLD_OFF: [0x1B, 0x45, 0x00], // Bold off
    FONT_SIZE_NORMAL: [0x1D, 0x21, 0x00], // Normal size
    FONT_SIZE_DOUBLE_HEIGHT: [0x1D, 0x21, 0x01], // Double height
    FONT_SIZE_DOUBLE_WIDTH: [0x1D, 0x21, 0x10], // Double width
    FONT_SIZE_DOUBLE_BOTH: [0x1D, 0x21, 0x11], // Double both
    LINE_SPACING_DEFAULT: [0x1B, 0x32], // Default line spacing
    LINE_SPACING_24: [0x1B, 0x33, 0x18], // 24-dot line spacing
    CUT_PAPER: [0x1D, 0x56, 0x42, 0x00], // Full cut
    PARTIAL_CUT: [0x1D, 0x56, 0x41], // Partial cut
    FEED_3_LINES: [0x1B, 0x64, 0x03], // Feed 3 lines
    FEED_5_LINES: [0x1B, 0x64, 0x05], // Feed 5 lines
  };

  // Common thermal printer vendor IDs
  private static readonly VENDOR_IDS = {
    EPSON: 0x04b8,
    CUSTOM: 0x1cb0, // Custom/China manufacturer
    ZEBRA: 0x0a5f,
    STAR: 0x0519,
    CITIZEN: 0x08e6,
  };

  // Check if WebUSB is supported
  static isSupported(): boolean {
    try {
      return 'usb' in navigator && typeof (navigator as any).usb.requestDevice === 'function';
    } catch (error) {
      console.log('WebUSB not supported:', error);
      return false;
    }
  }

  // Request USB device
  static async requestDevice(options: WebUSBPrintOptions = {}): Promise<USBDevice | null> {
    if (!this.isSupported()) {
      throw new Error('WebUSB is not supported in this browser');
    }

    try {
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { 
            vendorId: options.vendorId || this.VENDOR_IDS.EPSON,
            productId: options.productId
          },
          { 
            vendorId: this.VENDOR_IDS.CUSTOM,
            productId: options.productId
          },
          { 
            vendorId: this.VENDOR_IDS.ZEBRA,
            productId: options.productId
          }
        ]
      });
      
      return device;
    } catch (error) {
      console.error('Failed to request USB device:', error);
      return null;
    }
  }

  // Connect to USB device
  static async connect(device: USBDevice): Promise<boolean> {
    try {
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      return true;
    } catch (error) {
      console.error('Failed to connect to USB device:', error);
      return false;
    }
  }

  // Disconnect from USB device
  static async disconnect(device: USBDevice): Promise<void> {
    try {
      if (device.opened) {
        await device.releaseInterface(0);
        await device.close();
      }
    } catch (error) {
      console.error('Failed to disconnect from USB device:', error);
    }
  }

  // Convert text to ESC/POS commands
  private static textToCommands(text: string, options: { bold?: boolean; align?: 'left' | 'center' | 'right'; fontSize?: 'normal' | 'double' } = {}): Uint8Array {
    const commands: number[] = [];
    
    // Initialize printer
    commands.push(...this.ESC_POS.INIT);
    
    // Set alignment
    switch (options.align) {
      case 'center':
        commands.push(...this.ESC_POS.ALIGN_CENTER);
        break;
      case 'right':
        commands.push(...this.ESC_POS.ALIGN_RIGHT);
        break;
      default:
        commands.push(...this.ESC_POS.ALIGN_LEFT);
    }
    
    // Set font size
    switch (options.fontSize) {
      case 'double':
        commands.push(...this.ESC_POS.FONT_SIZE_DOUBLE_BOTH);
        break;
      default:
        commands.push(...this.ESC_POS.FONT_SIZE_NORMAL);
    }
    
    // Set bold
    if (options.bold) {
      commands.push(...this.ESC_POS.BOLD_ON);
    } else {
      commands.push(...this.ESC_POS.BOLD_OFF);
    }
    
    // Add text
    const textEncoder = new TextEncoder();
    const textBytes = textEncoder.encode(text);
    commands.push(...Array.from(textBytes));
    
    // Add line feed
    commands.push(0x0A);
    
    return new Uint8Array(commands);
  }

  // Parse receipt content and convert to ESC/POS commands
  private static parseReceiptContent(content: string): Uint8Array {
    const lines = content.split('\n');
    const commands: number[] = [];
    
    // Initialize printer
    commands.push(...this.ESC_POS.INIT);
    commands.push(...this.ESC_POS.LINE_SPACING_24);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        commands.push(0x0A);
        continue;
      }
      
      // Check for headers (usually centered and bold)
      if (trimmedLine.includes('===') || trimmedLine.includes('---') || 
          trimmedLine.match(/^[A-Z\s]{3,}$/) || 
          trimmedLine.match(/^(BILL|INVOICE|RECEIPT|ORDER)/i)) {
        const headerCommands = this.textToCommands(trimmedLine, { 
          bold: true, 
          align: 'center', 
          fontSize: 'double' 
        });
        commands.push(...Array.from(headerCommands));
        continue;
      }
      
      // Check for totals (usually bold)
      if (trimmedLine.match(/(TOTAL|SUBTOTAL|TAX|GRAND)/i) || 
          trimmedLine.match(/[\d,]+\.\d{2}$/)) {
        const totalCommands = this.textToCommands(trimmedLine, { 
          bold: true, 
          align: 'left' 
        });
        commands.push(...Array.from(totalCommands));
        continue;
      }
      
      // Check for separators
      if (trimmedLine.match(/^[-=]{10,}$/)) {
        const separatorCommands = this.textToCommands(trimmedLine, { 
          align: 'center' 
        });
        commands.push(...Array.from(separatorCommands));
        continue;
      }
      
      // Regular line
      const lineCommands = this.textToCommands(trimmedLine, { 
        align: 'left' 
      });
      commands.push(...Array.from(lineCommands));
    }
    
    // Add some feed lines and cut
    commands.push(...this.ESC_POS.FEED_5_LINES);
    commands.push(...this.ESC_POS.CUT_PAPER);
    
    return new Uint8Array(commands);
  }

  // Print via WebUSB
  static async printViaWebUSB(content: string, options: WebUSBPrintOptions = {}): Promise<boolean> {
    let device: USBDevice | null = null;
    
    try {
      // Request and connect to device
      device = await this.requestDevice(options);
      if (!device) {
        throw new Error('No USB device selected');
      }
      
      const connected = await this.connect(device);
      if (!connected) {
        throw new Error('Failed to connect to USB device');
      }
      
      // Parse content and convert to ESC/POS commands
      const commands = this.parseReceiptContent(content);
      
      // Send commands to printer
      const copies = options.copies || 1;
      for (let i = 0; i < copies; i++) {
        await device.transferOut(1, new Uint8Array(commands));
        
        // Small delay between copies
        if (i < copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return true;
    } catch (error) {
      console.error('WebUSB printing failed:', error);
      return false;
    } finally {
      if (device) {
        await this.disconnect(device);
      }
    }
  }

  // Get connected USB devices
  static async getConnectedDevices(): Promise<USBDevice[]> {
    if (!this.isSupported()) {
      return [];
    }
    
    try {
      const devices = await (navigator as any).usb.getDevices();
      return devices.filter((device: USBDevice) => 
        Object.values(this.VENDOR_IDS).includes(device.vendorId)
      );
    } catch (error) {
      console.error('Failed to get connected USB devices:', error);
      return [];
    }
  }

  // Simple print method for testing
  static async testPrint(): Promise<boolean> {
    try {
      console.log('🔌 Testing WebUSB printing...');
      
      if (!this.isSupported()) {
        console.log('❌ WebUSB not supported in this browser');
        return false;
      }

      // Try to get connected devices first
      const devices = await this.getConnectedDevices();
      if (devices.length === 0) {
        console.log('❌ No USB devices found. Trying to request device...');
        
        // Try to request a device
        const device = await this.requestDevice();
        if (!device) {
          console.log('❌ No USB device selected');
          return false;
        }
        
        console.log('✅ USB device found:', device.productName || 'Unknown device');
        return true;
      } else {
        console.log('✅ Found USB devices:', devices.length);
        return true;
      }
    } catch (error) {
      console.error('❌ WebUSB test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const webusbPrintService = WebUSBPrintService;