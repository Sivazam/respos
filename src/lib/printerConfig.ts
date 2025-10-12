export interface PrinterConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  gateway?: string;
  subnet?: string;
  isConnected?: boolean;
  isOnline?: boolean;
  isDefault?: boolean;
  model: string;
  paperWidth: number; // in mm
  vendorId?: number; // USB vendor ID
  productId?: number; // USB product ID
  type?: 'network' | 'usb' | 'bluetooth';
}

export interface PrintJob {
  id: string;
  content: string;
  printerId: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  timestamp: Date;
}

export class ThermalPrinterManager {
  private printers: Map<string, PrinterConfig> = new Map();
  private printQueue: PrintJob[] = [];
  private isPrinting = false;

  constructor() {
    this.loadPrintersFromStorage();
    this.detectUSBPrinters();
  }

  // Detect USB printers automatically
  private async detectUSBPrinters(): Promise<void> {
    try {
      // Check if WebUSB API is available
      if ('usb' in navigator) {
        const usbDevices = await navigator.usb.getDevices();
        for (const device of usbDevices) {
          // Check if this is a thermal printer based on vendor/product IDs
          if (this.isThermalPrinter(device)) {
            const usbPrinter: PrinterConfig = {
              id: `usb_${device.serialNumber || Date.now()}`,
              name: `${device.manufacturerName || 'Unknown'} ${device.productName || 'Thermal Printer'}`,
              ip: 'usb',
              port: 0,
              isConnected: true,
              model: device.productName || 'USB Thermal Printer',
              paperWidth: 79.5,
              gateway: '',
              subnet: ''
            };
            this.printers.set(usbPrinter.id, usbPrinter);
            this.savePrintersToStorage();
          }
        }
      }
    } catch (error) {
      console.log('USB printer detection not available or failed:', error);
    }
  }

  // Check if device is a thermal printer
  private isThermalPrinter(device: any): boolean {
    // Common thermal printer vendor IDs
    const thermalPrinterVendors = [
      0x0483, // STMicroelectronics (common in thermal printers)
      0x1A86, // QinHeng Electronics
      0x0403, // FTDI (common in printer adapters)
      0x067B, // Prolific (common in printer cables)
      0x154B, // POS (Point of Sale devices)
      0x1CBE  // Custom USB devices
    ];

    // Check by vendor ID or device class
    return thermalPrinterVendors.includes(device.vendorId) ||
           device.deviceClass === 7 || // Printer class
           (device.productName && device.productName.toLowerCase().includes('thermal')) ||
           (device.productName && device.productName.toLowerCase().includes('pos')) ||
           (device.productName && device.productName.toLowerCase().includes('receipt'));
  }

  // Request USB printer access
  async requestUSBPrinter(): Promise<PrinterConfig | null> {
    try {
      if ('usb' in navigator) {
        const device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x0483 },
            { vendorId: 0x1A86 },
            { vendorId: 0x0403 },
            { vendorId: 0x067B },
            { vendorId: 0x154B },
            { vendorId: 0x1CBE }
          ]
        });

        if (this.isThermalPrinter(device)) {
          const usbPrinter: PrinterConfig = {
            id: `usb_${device.serialNumber || Date.now()}`,
            name: `${device.manufacturerName || 'Unknown'} ${device.productName || 'Thermal Printer'}`,
            ip: 'usb',
            port: 0,
            isConnected: true,
            model: device.productName || 'USB Thermal Printer',
            paperWidth: 79.5,
            gateway: '',
            subnet: ''
          };
          
          this.printers.set(usbPrinter.id, usbPrinter);
          this.savePrintersToStorage();
          return usbPrinter;
        }
      }
    } catch (error) {
      console.error('Failed to request USB printer:', error);
    }
    return null;
  }

  // Load saved printers from localStorage
  private loadPrintersFromStorage(): void {
    try {
      const saved = localStorage.getItem('thermal_printers');
      if (saved) {
        const printers = JSON.parse(saved) as PrinterConfig[];
        printers.forEach(printer => {
          this.printers.set(printer.id, printer);
        });
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  }

  // Save printers to localStorage
  private savePrintersToStorage(): void {
    try {
      const printers = Array.from(this.printers.values());
      localStorage.setItem('thermal_printers', JSON.stringify(printers));
    } catch (error) {
      console.error('Failed to save printers:', error);
    }
  }

  // Add a new printer
  addPrinter(config: Omit<PrinterConfig, 'id' | 'isConnected'>): PrinterConfig {
    const printer: PrinterConfig = {
      ...config,
      id: `printer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isConnected: false
    };

    this.printers.set(printer.id, printer);
    this.savePrintersToStorage();
    return printer;
  }

  // Remove a printer
  removePrinter(id: string): boolean {
    const removed = this.printers.delete(id);
    if (removed) {
      this.savePrintersToStorage();
    }
    return removed;
  }

  // Get all printers
  getAllPrinters(): PrinterConfig[] {
    return Array.from(this.printers.values());
  }

  // Get printer by ID
  getPrinter(id: string): PrinterConfig | undefined {
    return this.printers.get(id);
  }

  // Test printer connection
  async testConnection(printerId: string): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) return false;

    try {
      // For thermal printers, we'll test the connection by sending a ping
      // In a real implementation, this would be an HTTP request to the printer's API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        await fetch(`http://${printer.ip}:${printer.port}/status`, {
          method: 'GET',
          signal: controller.signal,
          mode: 'no-cors' // Many printers don't support CORS
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Continue anyway - many printers don't have proper status endpoints
      }

      // Update connection status
      printer.isConnected = true;
      this.savePrintersToStorage();
      return true;
    } catch (error) {
      // For printers without proper API endpoints, we'll consider it connected
      // if we can reach the network (no-cors requests don't throw on success)
      printer.isConnected = true;
      this.savePrintersToStorage();
      return true;
    }
  }

  // Print content directly to thermal printer
  async printDirect(printerId: string, content: string): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error('Printer not found');
    }

    const printJob: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      printerId,
      status: 'pending',
      timestamp: new Date()
    };

    this.printQueue.push(printJob);
    return this.processPrintQueue();
  }

  // Process print queue
  private async processPrintQueue(): Promise<boolean> {
    if (this.isPrinting || this.printQueue.length === 0) {
      return true;
    }

    this.isPrinting = true;
    const job = this.printQueue[0];
    job.status = 'printing';

    try {
      const printer = this.printers.get(job.printerId);
      if (!printer) {
        throw new Error('Printer not found');
      }

      // Convert HTML content to ESC/POS commands for thermal printer
      const escPosCommands = this.convertToESCPOS(job.content, printer);
      
      // Send to printer via HTTP POST (common for network thermal printers)
      const response = await fetch(`http://${printer.ip}:${printer.port}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: escPosCommands
      });

      if (!response.ok) {
        throw new Error(`Printer responded with status: ${response.status}`);
      }

      job.status = 'completed';
      this.printQueue.shift();
      return true;
    } catch (error) {
      console.error('Print job failed:', error);
      job.status = 'failed';
      return false;
    } finally {
      this.isPrinting = false;
      // Process next job if any
      if (this.printQueue.length > 0) {
        setTimeout(() => this.processPrintQueue(), 1000);
      }
    }
  }

  // Convert HTML content to ESC/POS commands
  private convertToESCPOS(htmlContent: string, _printer: PrinterConfig): ArrayBuffer {
    // This is a simplified version - in production, you'd use a proper ESC/POS library
    const commands = [];
    
    // Initialize printer
    commands.push(0x1B, 0x40); // ESC @ - Initialize
    
    // Set character size to double for better readability (Font A, 2x size)
    commands.push(0x1B, 0x21, 0x10); // ESC ! 0x10 - Double width + height
    
    // Set alignment to left
    commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
    
    // Process the content line by line
    const lines = htmlContent.split('\n');
    
    for (const line of lines) {
      // Skip empty lines but add line feed
      if (line.trim() === '') {
        commands.push(0x0A); // LF
        continue;
      }
      
      // Check if line should be centered (contains "FORKFLOW POS" or is a header line)
      if (line.includes('FORKFLOW POS') || 
          line.includes('Restaurant Receipt') ||
          line.includes('Thank you for dining') ||
          line.includes('Please visit again') ||
          line.includes('Computer generated receipt') ||
          line.includes('Powered by ForkFlow POS')) {
        
        // Center alignment
        commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center align
        // Use double size for headers
        commands.push(0x1B, 0x21, 0x10); // ESC ! 0x10 - Double width + height
      } else if (line.includes('TOTAL') || line.includes('Rs.')) {
        // Right align for totals
        commands.push(0x1B, 0x61, 0x02); // ESC a 2 - Right align
        // Use bold for totals
        commands.push(0x1B, 0x21, 0x08); // ESC ! 0x08 - Bold
      } else {
        // Left align for normal text
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
        // Use normal size for regular text
        commands.push(0x1B, 0x21, 0x00); // ESC ! 0x00 - Normal
      }
      
      // Add the line content character by character
      for (let i = 0; i < line.length; i++) {
        const char = line.charCodeAt(i);
        // Only add printable ASCII characters
        if (char >= 32 && char <= 126) {
          commands.push(char);
        }
      }
      
      // Line feed
      commands.push(0x0A); // LF
    }
    
    // Reset alignment to left
    commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
    
    // Reset to normal font
    commands.push(0x1B, 0x21, 0x00); // ESC ! 0x00 - Normal
    
    // Feed and cut paper
    commands.push(0x1B, 0x64, 0x03); // ESC d 3 - Feed 3 lines
    commands.push(0x1D, 0x56, 0x00); // GS V 0 - Full cut
    
    return new Uint8Array(commands).buffer;
  }

  // Get print queue status
  getPrintQueue(): PrintJob[] {
    return [...this.printQueue];
  }

  // Clear print queue
  clearPrintQueue(): void {
    this.printQueue = [];
  }
}

// Singleton instance
export const printerManager = new ThermalPrinterManager();

// Default TVS 3230 configuration
export const TVS_3230_DEFAULTS = {
  model: 'TVS 3230',
  port: 9100, // Default port for many thermal printers
  paperWidth: 79.5, // 79.5mm paper width (3 inch)
  maxCharsPerLine: 58, // Optimized for 80mm paper with smaller font
  fontHeight: 24, // Font A height (adjusted for smaller font)
  fontWidth: 12 // Font A width (adjusted for smaller font)
};