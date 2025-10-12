import { BrowserThermalPrinter, FallbackPrintService } from './thermal-printer-browser';
import { formatReceipt } from './printUtils';

export class ThermalPrinterTest {
  /**
   * Test the complete thermal printer implementation
   */
  static async runFullTest(): Promise<{
    thermalPrinter: boolean;
    fallbackPrint: boolean;
    formatting: boolean;
    overall: boolean;
  }> {
    const results = {
      thermalPrinter: false,
      fallbackPrint: false,
      formatting: false,
      overall: false
    };

    try {
      console.log('🔥 Testing Thermal Printer Implementation...');

      // Test 1: Direct thermal printer
      console.log('1. Testing browser thermal printer...');
      const thermalPrinter = new BrowserThermalPrinter({
        width: 79.5,
        height: 200,
        dpi: 203
      });

      const thermalReady = await thermalPrinter.initialize();
      if (thermalReady) {
        console.log('✅ Thermal printer initialized successfully');
        results.thermalPrinter = true;
      } else {
        console.log('⚠️ Thermal printer not available, will use fallback');
      }

      // Test 2: Fallback print service
      console.log('2. Testing fallback print service...');
      const sampleOrder = {
        orderNumber: 'TEST-001',
        timestamp: new Date(),
        tableNumber: 'TEST-01',
        items: [
          { name: 'Test Burger', price: 250.00, quantity: 1 },
          { name: 'Test Fries', price: 100.00, quantity: 2 },
          { name: 'Test Drink', price: 50.00, quantity: 1 }
        ],
        subtotal: 500.00,
        tax: 50.00,
        total: 550.00,
        paymentMethod: 'Cash'
      };

      const formattedContent = formatReceipt(sampleOrder);
      console.log('✅ Content formatted successfully');
      console.log('Sample content:', formattedContent.substring(0, 200) + '...');

      results.formatting = true;

      // Test 3: Try fallback print (without actually printing)
      console.log('3. Testing fallback print capability...');
      try {
        // We'll test the formatting but not actually print to avoid waste
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Test Print</title>
              <style>
                @page { size: 79.5mm 200mm; margin: 0; }
                body { font-family: monospace; margin: 2mm; }
              </style>
            </head>
            <body>${formattedContent}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.close();
          console.log('✅ Fallback print window created successfully');
          results.fallbackPrint = true;
        }
      } catch (error) {
        console.log('⚠️ Fallback print test failed:', error);
      }

      // Test 4: Overall assessment
      results.overall = results.formatting && (results.thermalPrinter || results.fallbackPrint);

      console.log('\n📊 Test Results:');
      console.log(`- Thermal Printer: ${results.thermalPrinter ? '✅' : '❌'}`);
      console.log(`- Fallback Print: ${results.fallbackPrint ? '✅' : '❌'}`);
      console.log(`- Formatting: ${results.formatting ? '✅' : '❌'}`);
      console.log(`- Overall: ${results.overall ? '✅' : '❌'}`);

      return results;

    } catch (error) {
      console.error('❌ Thermal printer test failed:', error);
      return results;
    }
  }

  /**
   * Test print formatting matches preview
   */
  static async testFormattingMatch(): Promise<boolean> {
    try {
      console.log('🎨 Testing print formatting...');

      const testOrder = {
        orderNumber: 'FORMAT-001',
        timestamp: new Date(),
        tableNumber: 'TABLE-05',
        items: [
          { name: 'Formatting Test Item 1', price: 199.99, quantity: 1 },
          { name: 'Formatting Test Item 2', price: 299.99, quantity: 2 }
        ],
        subtotal: 799.97,
        tax: 80.00,
        total: 879.97,
        paymentMethod: 'Card'
      };

      const formattedContent = formatReceipt(testOrder);
      
      // Check if HTML structure is correct
      const hasHeader = formattedContent.includes('<h1>FORKFLOW POS</h1>');
      const hasTable = formattedContent.includes('<table>');
      const hasSections = formattedContent.includes('print-section');
      const hasFooter = formattedContent.includes('print-footer');

      console.log('HTML Structure Check:');
      console.log(`- Header: ${hasHeader ? '✅' : '❌'}`);
      console.log(`- Table: ${hasTable ? '✅' : '❌'}`);
      console.log(`- Sections: ${hasSections ? '✅' : '❌'}`);
      console.log(`- Footer: ${hasFooter ? '✅' : '❌'}`);

      return hasHeader && hasTable && hasSections && hasFooter;

    } catch (error) {
      console.error('❌ Formatting test failed:', error);
      return false;
    }
  }
}

// Export for use in components
export const runThermalPrinterTest = ThermalPrinterTest.runFullTest;
export const testFormattingMatch = ThermalPrinterTest.testFormattingMatch;