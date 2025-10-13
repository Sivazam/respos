import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Receipt } from '../../types';
import { browserPrintService } from '@/lib/browserPrint';
import { getFranchiseReceiptData } from '../../utils/franchiseUtils';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  isReturn?: boolean;
  locationId?: string;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, isReturn = false, locationId }) => {
  const { sale, businessName, businessAddress, gstNumber, contactNumber, email } = receipt;
  const [franchiseData, setFranchiseData] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    gstNumber: string | null;
  } | null>(null);

  // Fetch franchise data when component mounts or locationId changes
  useEffect(() => {
    const fetchFranchiseData = async () => {
      if (locationId) {
        const data = await getFranchiseReceiptData(locationId);
        setFranchiseData(data);
      }
    };

    fetchFranchiseData();
  }, [locationId]);
  
  // Calculate GST percentages from sale data
  const cgstPercentage = sale.subtotal > 0 ? (sale.cgst / sale.subtotal) * 100 : 0;
  const sgstPercentage = sale.subtotal > 0 ? (sale.sgst / sale.subtotal) * 100 : 0;

  // Helper function to create receipt text content
  const createReceiptTextContent = () => {
    // Standard thermal receipt format - 48 characters width
    const centerText = (text: string) => {
      const padding = Math.floor((48 - text.length) / 2);
      return ' '.repeat(Math.max(0, padding)) + text;
    };
    
    const formatPrice = (price: number | undefined | null) => {
      if (price === undefined || price === null || isNaN(price)) {
        return '0.00';
      }
      return price.toFixed(2);
    };
    
    let content = '';
    
    // Logo (centered)
    content += centerText('🍽️') + '\n';
    content += '\n';
    
    // Restaurant Header (centered)
    content += centerText(franchiseData?.name || businessName) + '\n';
    content += centerText(franchiseData?.address || businessAddress) + '\n';
    content += centerText(`Phone: ${franchiseData?.phone || contactNumber || '+91 98765 43210'}`) + '\n';
    content += centerText(`GSTIN: ${franchiseData?.gstNumber || gstNumber}`) + '\n';
    content += '-'.repeat(48) + '\n';
    
    // Order Info
    const now = new Date();
    content += `Date: ${now.toLocaleDateString()}  Time: ${now.toLocaleTimeString()}` + '\n';
    if (sale.tableNumber) {
      content += `Table: ${sale.tableNumber}`.padEnd(24) + `${isReturn ? 'Return' : 'Order'}: #${sale.id}` + '\n';
    } else {
      content += `${isReturn ? 'Return' : 'Order'}: #${sale.id}` + '\n';
    }
    content += '-'.repeat(48) + '\n';
    
    // Items Header
    content += 'Item'.padEnd(18) + 'Qty'.padStart(6) + 'Rate'.padStart(8) + 'Total'.padStart(8) + '\n';
    content += '-'.repeat(48) + '\n';
    
    // Items
    const items = sale.items || [];
    items.forEach((item: any) => {
      const itemName = item.name || 'Unknown Item';
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const itemTotal = price * quantity;
      
      // Truncate item name if too long
      const truncatedName = itemName.length > 18 ? itemName.substring(0, 15) + '...' : itemName;
      
      content += truncatedName.padEnd(18) + 
                  quantity.toString().padStart(6) + 
                  formatPrice(price).padStart(8) + 
                  formatPrice(itemTotal).padStart(8) + '\n';
                  
      // Show modifications if any
      if (item.modifications && item.modifications.length > 0) {
        const mods = item.modifications.join(', ');
        const modText = mods.length > 40 ? mods.substring(0, 37) + '...' : mods;
        content += '  ' + modText + '\n';
      }
    });
    
    content += '-'.repeat(48) + '\n';
    
    // Totals
    content += 'Subtotal'.padEnd(30) + formatPrice(sale.subtotal).padStart(10) + '\n';
    
    if (sale.cgst > 0) {
      content += `CGST (${cgstPercentage.toFixed(1)}%)`.padEnd(30) + formatPrice(sale.cgst).padStart(10) + '\n';
    }
    if (sale.sgst > 0) {
      content += `SGST (${sgstPercentage.toFixed(1)}%)`.padEnd(30) + formatPrice(sale.sgst).padStart(10) + '\n';
    }
    if (sale.gst > 0) {
      const totalGstPercentage = cgstPercentage + sgstPercentage;
      content += `GST (${totalGstPercentage.toFixed(1)}%)`.padEnd(30) + formatPrice(sale.gst).padStart(10) + '\n';
    }
    
    if (sale.discount > 0) {
      content += 'Discount'.padEnd(30) + '-' + formatPrice(sale.discount).padStart(9) + '\n';
    }
    
    content += '-'.repeat(48) + '\n';
    content += 'Grand Total'.padEnd(30) + formatPrice(sale.total).padStart(10) + '\n';
    content += '-'.repeat(48) + '\n';
    
    // Payment Info
    content += `Paid by: ${(sale.paymentMethod || 'Cash').toUpperCase()}` + '\n';
    content += '\n';
    
    // Footer
    content += centerText('Thank you for dining with us!') + '\n';
    content += '\n';
    content += centerText('Powered by FORKFLOW POS') + '\n';
    content += '\n\n\n'; // Extra space for cutting
    
    return content;
  };

  const handlePrint = async () => {
    try {
      // Create receipt content as plain text for thermal printer
      const receiptContent = createReceiptTextContent();
      
      // Calculate dynamic height based on content
      const lineCount = receiptContent.split('\n').length;
      const estimatedHeight = Math.max(120, Math.min(300, lineCount * 6 + 40)); // 6mm per line + margins
      
      // Try silent printing first with correct paper size
      const success = await browserPrintService.printSilent(receiptContent, {
        paperSize: '79.5mm 200mm',
        copies: 1,
        dynamicHeight: true,
        calculatedHeight: estimatedHeight
      });
      
      if (!success) {
        // Fallback to direct printing (no extra tab)
        const directSuccess = await browserPrintService.printDirect(receiptContent, {
          paperSize: '79.5mm 200mm',
          copies: 1,
          dynamicHeight: true,
          calculatedHeight: estimatedHeight
        });
        
        if (!directSuccess) {
          // Final fallback - use iframe print without opening new tab
          await browserPrintService.printWithIframe(receiptContent, {
            dynamicHeight: true,
            calculatedHeight: estimatedHeight
          });
        }
      }
    } catch (error) {
      console.error('Print failed:', error);
      // Final fallback - use iframe print without opening new tab
      const receiptContent = createReceiptTextContent();
      const lineCount = receiptContent.split('\n').length;
      const estimatedHeight = Math.max(120, Math.min(300, lineCount * 6 + 40));
      
      await browserPrintService.printWithIframe(receiptContent, {
        dynamicHeight: true,
        calculatedHeight: estimatedHeight
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6" id="receipt-content">
          {/* Receipt content styled for 80mm thermal printer */}
          <div style={{ 
            width: '302px', /* 80mm ≈ 302px at 96 DPI */
            margin: '0 auto', 
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.2',
            color: '#000',
            fontWeight: '800'
          }}>
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <img 
                src={franchiseData?.logoUrl || "https://firebasestorage.googleapis.com/v0/b/restpossys.firebasestorage.app/o/WhatsApp%20Image%202025-10-12%20at%2006.01.10_f3bd32d3.jpg?alt=media&token=d3f11b5d-c210-4c1d-98a2-5521ff2e07fd"} 
                alt="Restaurant Logo" 
                style={{ width: '160px', height: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
              />
            </div>

            {/* Header */}
            <div className="text-center" style={{ fontSize: '20px', fontWeight: '900', marginBottom: '8px' }}>
              {franchiseData?.name || businessName}
            </div>
            
            <div className="text-center mb-4" style={{ fontWeight: '700' }}>
              {(franchiseData?.address || businessAddress).split(',').map((line, i) => (
                <div key={i}>{line.trim()}</div>
              ))}
              <div>GST No: {franchiseData?.gstNumber || gstNumber}</div>
              <div>Tel: {franchiseData?.phone || contactNumber}</div>
              <div>{franchiseData?.email || email}</div>
            </div>

            {/* Solid line after GSTIN */}
            <div className="border-t border-black pt-2 mb-2"></div>

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Invoice Details */}
            <div className="mb-2" style={{ fontWeight: '600' }}>
              <div className="flex justify-between mb-1">
                <span>{isReturn ? 'Return' : 'Invoice'} No:</span>
                <span>{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(sale.createdAt, 'dd/MM/yyyy HH:mm')}</span>
              </div>
              {isReturn && (
                <div className="text-center font-black mt-2">
                  ** RETURN RECEIPT **
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Items Header */}
            <div className="grid grid-cols-12 font-black mb-2">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Items */}
            {sale.items.map(item => (
              <div key={item.id} className="grid grid-cols-12 mb-1" style={{ fontWeight: '600' }}>
                <div className="col-span-6">{item.name}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">{item.price.toFixed(2)}</div>
                <div className="col-span-2 text-right">₹{(item.quantity * item.price).toFixed(2)}</div>
              </div>
            ))}

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Summary */}
            <div className="space-y-1 mb-2">
              <div className="flex justify-between" style={{ fontWeight: '600' }}>
                <span>Subtotal:</span>
                <span>₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {cgstPercentage > 0 && (
                <div className="flex justify-between" style={{ fontWeight: '600' }}>
                  <span>CGST ({cgstPercentage.toFixed(1)}%):</span>
                  <span>₹{sale.cgst.toFixed(2)}</span>
                </div>
              )}
              {sgstPercentage > 0 && (
                <div className="flex justify-between" style={{ fontWeight: '600' }}>
                  <span>SGST ({sgstPercentage.toFixed(1)}%):</span>
                  <span>₹{sale.sgst.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-black pt-1 mt-1">
                <div className="flex justify-between font-black text-lg">
                  <span>{isReturn ? 'Return Amount' : 'TOTAL'}:</span>
                  <span>₹{sale.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Payment Method */}
            <div className="text-center font-black mb-2">
              {isReturn ? 'Refund Method' : 'Payment Method'}: {sale.paymentMethod.toUpperCase()}
            </div>

            {/* Divider */}
            <div className="text-center mb-2">{'='.repeat(58)}</div>

            {/* Footer */}
            <div className="text-center space-y-1">
              <div className="font-black">
                {isReturn ? 'Return processed successfully!' : 'Thank you for dining with us!'}
              </div>
              <div style={{ fontWeight: '600' }}>Please visit again</div>
              <div style={{ fontWeight: '600' }}>This is a computer-generated receipt</div>
              <div style={{ fontWeight: '600' }}>Powered by FORKFLOW POS</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t p-4 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;