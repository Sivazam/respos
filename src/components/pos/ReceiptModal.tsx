import React from 'react';
import { format } from 'date-fns';
import { Receipt } from '../../types';
import { Utensils } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt;
  onClose: () => void;
  onPrint: () => void;
  isReturn?: boolean;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, onPrint, isReturn = false }) => {
  const { sale, businessName, businessAddress, gstNumber, contactNumber, email } = receipt;
  
  // Calculate GST percentages from sale data
  const cgstPercentage = sale.subtotal > 0 ? (sale.cgst / sale.subtotal) * 100 : 0;
  const sgstPercentage = sale.subtotal > 0 ? (sale.sgst / sale.subtotal) * 100 : 0;

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=320');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${isReturn ? 'Return' : 'Sale'} Receipt</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Courier New', monospace;
                font-size: 11px;
                line-height: 1.2;
                color: #000;
                background: #fff;
                width: 80mm;
                max-width: 80mm;
                margin: 0 auto;
                padding: 2mm;
              }
              
              .receipt-container {
                width: 100%;
                max-width: 76mm;
                margin: 0 auto;
              }
              
              .center {
                text-align: center;
              }
              
              .left {
                text-align: left;
              }
              
              .right {
                text-align: right;
              }
              
              .bold {
                font-weight: bold;
              }
              
              .large {
                font-size: 14px;
                font-weight: bold;
              }
              
              .medium {
                font-size: 12px;
              }
              
              .small {
                font-size: 10px;
              }
              
              .divider {
                border-top: 1px dashed #000;
                margin: 3px 0;
                width: 100%;
              }
              
              .double-divider {
                border-top: 2px solid #000;
                margin: 3px 0;
                width: 100%;
              }
              
              .spacer {
                height: 2mm;
              }
              
              .logo {
                margin: 2mm 0;
              }
              
              .header {
                margin-bottom: 3mm;
              }
              
              .business-info {
                margin-bottom: 3mm;
              }
              
              .invoice-info {
                margin-bottom: 3mm;
              }
              
              .items-table {
                width: 100%;
                margin-bottom: 3mm;
              }
              
              .items-header {
                border-bottom: 1px solid #000;
                padding-bottom: 1px;
                margin-bottom: 2px;
              }
              
              .item-row {
                margin-bottom: 1px;
              }
              
              .summary {
                margin-top: 3mm;
                border-top: 1px solid #000;
                padding-top: 2mm;
              }
              
              .total-row {
                border-top: 1px solid #000;
                padding-top: 1mm;
                margin-top: 1mm;
                font-weight: bold;
              }
              
              .footer {
                margin-top: 4mm;
                text-align: center;
              }
              
              .return-notice {
                background: #f0f0f0;
                padding: 2mm;
                margin: 2mm 0;
                text-align: center;
                font-weight: bold;
                border: 1px solid #000;
              }
              
              /* Flex layouts for alignment */
              .flex-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
              }
              
              .flex-left {
                text-align: left;
                flex: 1;
              }
              
              .flex-right {
                text-align: right;
                flex-shrink: 0;
                min-width: 20mm;
              }
              
              .flex-center {
                text-align: center;
                flex-shrink: 0;
                min-width: 10mm;
              }
              
              /* Print specific styles */
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
            <div class="receipt-container">
              <div class="logo center">
                <div style="font-size: 24px;">🍽️</div>
              </div>
              <div class="header center">
                <div class="large bold">${businessName}</div>
              </div>
              <div class="business-info center small">
                ${businessAddress.split(',').map(line => `<div>${line.trim()}</div>`).join('')}
                <div>GST: ${gstNumber}</div>
                <div>Tel: ${contactNumber}</div>
                <div>${email}</div>
              </div>
              <div class="divider"></div>
              ${isReturn ? '<div class="return-notice medium bold">*** RETURN RECEIPT ***</div>' : ''}
              <div class="invoice-info">
                <div class="flex-row">
                  <span class="flex-left">${isReturn ? 'Return' : 'Invoice'} No:</span>
                  <span class="flex-right bold">${sale.invoiceNumber}</span>
                </div>
                <div class="flex-row">
                  <span class="flex-left">Date:</span>
                  <span class="flex-right">${format(sale.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                </div>
              </div>
              <div class="divider"></div>
              <div class="items-table">
                <div class="items-header">
                  <div class="flex-row bold small">
                    <span class="flex-left">Item</span>
                    <span class="flex-center">Qty</span>
                    <span class="flex-center">Rate</span>
                    <span class="flex-right">Amount</span>
                  </div>
                </div>
                ${sale.items.map(item => `
                  <div class="item-row">
                    <div class="flex-row small">
                      <span class="flex-left" style="max-width: 35mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.name}
                      </span>
                      <span class="flex-center">${item.quantity}</span>
                      <span class="flex-center">${item.price.toFixed(2)}</span>
                      <span class="flex-right">${(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="divider"></div>
              <div class="summary">
                <div class="flex-row">
                  <span class="flex-left">Subtotal:</span>
                  <span class="flex-right">₹${sale.subtotal.toFixed(2)}</span>
                </div>
                ${cgstPercentage > 0 ? `
                <div class="flex-row">
                  <span class="flex-left">CGST (${cgstPercentage.toFixed(1)}%):</span>
                  <span class="flex-right">₹${sale.cgst.toFixed(2)}</span>
                </div>
                ` : ''}
                ${sgstPercentage > 0 ? `
                <div class="flex-row">
                  <span class="flex-left">SGST (${sgstPercentage.toFixed(1)}%):</span>
                  <span class="flex-right">₹${sale.sgst.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                  <div class="flex-row large">
                    <span class="flex-left bold">${isReturn ? 'Return Amount' : 'TOTAL'}:</span>
                    <span class="flex-right bold">₹${sale.total.toFixed(2)}</span>
                  </div>
                </div>
                <div class="spacer"></div>
                <div class="center medium">
                  <div class="bold">
                    ${isReturn ? 'Refund Method' : 'Payment Method'}: ${sale.paymentMethod.toUpperCase()}
                  </div>
                </div>
              </div>
              <div class="double-divider"></div>
              <div class="footer">
                <div class="medium bold">
                  ${isReturn ? 'Return processed successfully!' : 'Thank you for your business!'}
                </div>
                <div class="spacer"></div>
                <div class="small">Visit us again!</div>
                <div class="spacer"></div>
                <div class="small">This is a computer-generated receipt</div>
                <div class="spacer"></div>
                <div class="small">Powered by ForkFlow POS</div>
              </div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Small delay to ensure content is loaded
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6" id="receipt-content">
          {/* Receipt content styled for 80mm thermal printer */}
          <div style={{ 
            width: '302px', 
            margin: '0 auto', 
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.2',
            color: '#000'
          }}>
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <Utensils size={48} className="text-green-700" />
            </div>

            {/* Header */}
            <div className="text-center" style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {businessName}
            </div>
            <div className="text-center mb-2">
              {businessAddress.split(',').map((line, i) => (
                <div key={i}>{line.trim()}</div>
              ))}
              <div>GST No: {gstNumber}</div>
              <div>Tel: {contactNumber}</div>
              <div>{email}</div>
            </div>

            {/* Divider */}
            <div>{'-'.repeat(48)}</div>

            {/* Invoice Details */}
            <div>
              <div className="flex justify-between">
                <span>{isReturn ? 'Return' : 'Invoice'} No:</span>
                <span>{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(sale.createdAt, 'dd/MM/yyyy HH:mm')}</span>
              </div>
              {isReturn && (
                <div className="text-center font-bold mt-1">
                  ** RETURN RECEIPT **
                </div>
              )}
            </div>

            {/* Divider */}
            <div>{'-'.repeat(48)}</div>

            {/* Items Header */}
            <div className="grid grid-cols-12 font-bold">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right">Amt</div>
            </div>

            <div>{'-'.repeat(48)}</div>

            {/* Items */}
            {sale.items.map(item => (
              <div key={item.id} className="grid grid-cols-12">
                <div className="col-span-6">{item.name}</div>
                <div className="col-span-2 text-right">{item.quantity}</div>
                <div className="col-span-2 text-right">{item.price.toFixed(2)}</div>
                <div className="col-span-2 text-right">{(item.quantity * item.price).toFixed(2)}</div>
              </div>
            ))}

            {/* Divider */}
            <div>{'-'.repeat(48)}</div>

            {/* Summary */}
            <div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {cgstPercentage > 0 && (
                <div className="flex justify-between">
                  <span>CGST ({cgstPercentage.toFixed(1)}%):</span>
                  <span>₹{sale.cgst.toFixed(2)}</span>
                </div>
              )}
              {sgstPercentage > 0 && (
                <div className="flex justify-between">
                  <span>SGST ({sgstPercentage.toFixed(1)}%):</span>
                  <span>₹{sale.sgst.toFixed(2)}</span>
                </div>
              )}
              <div>{'-'.repeat(48)}</div>
              <div className="flex justify-between font-bold">
                <span>{isReturn ? 'Return Amount' : 'Total'}:</span>
                <span>₹{sale.total.toFixed(2)}</span>
              </div>
              <div className="text-center mt-1">
                {isReturn ? 'Refund Method' : 'Payment Method'}: {sale.paymentMethod.toUpperCase()}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center">
              <div>{'-'.repeat(48)}</div>
              <div>{isReturn ? 'Return processed successfully!' : 'Thank you for your business!'}</div>
              <div>Visit us again!</div>
              <div style={{ fontSize: '10px' }}>This is a computer-generated receipt</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 p-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;