import React, { useState } from 'react';
import { X, Printer, CreditCard, Smartphone, Wallet, AlertCircle, Check } from 'lucide-react';
import Button from '../ui/Button';

interface PrintAndPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onConfirm: (paymentMethod: 'cash' | 'card' | 'upi') => void;
  isProcessing?: boolean;
}

const PrintAndPayModal: React.FC<PrintAndPayModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirm,
  isProcessing = false
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !order) return null;

  const calculateOrderTotal = (order: any) => {
    const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    const cgst = subtotal * 0.025; // 2.5% CGST
    const sgst = subtotal * 0.025; // 2.5% SGST
    return {
      subtotal,
      cgst,
      sgst,
      total: subtotal + cgst + sgst
    };
  };

  const totals = calculateOrderTotal(order);

  const handlePrintReceipt = async () => {
    setIsPrinting(true);
    try {
      // Create a print-friendly version of the receipt
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const receiptContent = `
          <html>
            <head>
              <title>Receipt - Order #${order.orderNumber}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 20px; 
                  max-width: 400px;
                  margin: 0 auto;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 20px; 
                  border-bottom: 2px solid #333;
                  padding-bottom: 10px;
                }
                .business-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                .business-address { font-size: 12px; color: #666; margin-bottom: 5px; }
                .gst-number { font-size: 12px; color: #666; }
                .order-info { 
                  margin-bottom: 20px; 
                  background: #f9f9f9;
                  padding: 10px;
                  border-radius: 5px;
                }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .items { margin-bottom: 20px; }
                .item { 
                  display: flex; 
                  justify-content: space-between; 
                  margin-bottom: 8px;
                  padding: 5px 0;
                  border-bottom: 1px dashed #ddd;
                }
                .item-name { flex: 1; }
                .item-quantity { color: #666; margin-left: 10px; }
                .item-price { text-align: right; }
                .total { 
                  font-weight: bold; 
                  border-top: 2px solid #333; 
                  padding-top: 10px;
                  margin-top: 10px;
                }
                .payment-info {
                  background: #e8f5e8;
                  padding: 10px;
                  border-radius: 5px;
                  margin-top: 20px;
                  text-align: center;
                }
                .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  font-size: 12px; 
                  color: #666;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="business-name">ForkFlow</div>
                <div class="business-address">123 Food Street, Bangalore, Karnataka 560001</div>
                <div class="gst-number">GSTIN: 29ABCDE1234F1Z5</div>
              </div>
              
              <div class="order-info">
                <div class="info-row">
                  <span><strong>Order #:</strong></span>
                  <span>${order.orderNumber}</span>
                </div>
                <div class="info-row">
                  <span><strong>Date:</strong></span>
                  <span>${new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <div class="info-row">
                  <span><strong>Customer:</strong></span>
                  <span>${order.customerName || 'Guest'}</span>
                </div>
                <div class="info-row">
                  <span><strong>Type:</strong></span>
                  <span>${order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}</span>
                </div>
                ${order.tableNames ? `
                <div class="info-row">
                  <span><strong>Table:</strong></span>
                  <span>${order.tableNames.join(', ')}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="items">
                <h3 style="margin-bottom: 10px;">Order Items</h3>
                ${order.items?.map((item: any) => `
                  <div class="item">
                    <div class="item-name">
                      ${item.name}
                      <span class="item-quantity">x${item.quantity}</span>
                    </div>
                    <div class="item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                `).join('')}
              </div>
              
              <div class="total">
                <div class="info-row">
                  <span>Subtotal:</span>
                  <span>₹${totals.subtotal.toFixed(2)}</span>
                </div>
                <div class="info-row">
                  <span>CGST (2.5%):</span>
                  <span>₹${totals.cgst.toFixed(2)}</span>
                </div>
                <div class="info-row">
                  <span>SGST (2.5%):</span>
                  <span>₹${totals.sgst.toFixed(2)}</span>
                </div>
                <div class="info-row" style="font-size: 18px; margin-top: 10px;">
                  <span><strong>Total:</strong></span>
                  <span><strong>₹${totals.total.toFixed(2)}</strong></span>
                </div>
              </div>
              
              <div class="payment-info">
                <div style="margin-bottom: 5px;"><strong>Payment Method:</strong></div>
                <div style="text-transform: capitalize; font-size: 16px;">
                  ${selectedPaymentMethod === 'cash' ? '💵 Cash' : 
                    selectedPaymentMethod === 'card' ? '💳 Card' : 
                    '📱 UPI'}
                </div>
                <div style="margin-top: 10px; font-size: 14px;">
                  ${selectedPaymentMethod === 'cash' ? 'Paid in Cash' : 
                    selectedPaymentMethod === 'card' ? 'Paid via Card' : 
                    'Paid via UPI'}
                </div>
              </div>
              
              <div class="footer">
                <div>Thank you for dining with us!</div>
                <div>Visit again soon</div>
              </div>
            </body>
          </html>
        `;
        
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleConfirmPayment = () => {
    onConfirm(selectedPaymentMethod);
  };

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      icon: Wallet,
      description: 'Pay with cash'
    },
    {
      id: 'card',
      name: 'Card',
      icon: CreditCard,
      description: 'Pay with credit/debit card'
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: Smartphone,
      description: 'Pay via UPI apps'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Printer size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Print & Settle Bill</h2>
                <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{order.customerName || 'Guest'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}</span>
                </div>
                {order.tableNames && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-medium">{order.tableNames.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Select Payment Method</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id as any)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPaymentMethod === method.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon size={24} className={`mx-auto mb-2 ${
                        selectedPaymentMethod === method.id ? 'text-green-600' : 'text-gray-600'
                      }`} />
                      <div className="font-medium text-sm">{method.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{method.description}</div>
                      {selectedPaymentMethod === method.id && (
                        <div className="flex justify-center mt-2">
                          <Check size={16} className="text-green-600" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Order Items</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} className="text-blue-600" />
                <p className="text-sm text-blue-700">
                  After selecting payment method, you can print the receipt and then settle the order to move it to completed orders.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handlePrintReceipt}
                disabled={isPrinting}
                className="flex items-center space-x-2"
              >
                <Printer size={16} />
                <span>{isPrinting ? 'Printing...' : 'Print Receipt'}</span>
              </Button>
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleConfirmPayment}
                disabled={isProcessing || !selectedPaymentMethod}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Settling...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Check size={16} />
                    <span>Settle Order</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintAndPayModal;