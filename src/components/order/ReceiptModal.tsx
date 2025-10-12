import React, { useState } from 'react';
import { 
  Receipt, 
  X, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  CheckCircle 
} from 'lucide-react';
import Button from '../ui/Button';

interface PendingOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: any[];
  totalAmount: number;
  status: 'transferred' | 'ongoing';
  createdAt: Date;
  updatedAt: Date;
  staffId: string;
  transferredAt?: Date;
  transferredBy?: string;
  orderType: 'dinein' | 'delivery';
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PendingOrder;
  onSettle: (paymentMethod: string) => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  onSettle
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSettle = async () => {
    setIsProcessing(true);
    try {
      await onSettle(selectedPaymentMethod);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateGST = () => {
    return calculateSubtotal() * 0.05; // 5% GST
  };

  const calculateCGST = () => {
    return calculateGST() / 2; // Split GST equally
  };

  const calculateSGST = () => {
    return calculateGST() / 2; // Split GST equally
  };

  const subtotal = calculateSubtotal();
  const gst = calculateGST();
  const cgst = calculateCGST();
  const sgst = calculateSGST();
  const total = subtotal + gst;

  // Function to convert table IDs to table numbers if table names are not available
  const getTableDisplay = (tableNames?: string[], tableIds?: string[]) => {
    // If we have table names, use them
    if (tableNames && tableNames.length > 0) {
      return tableNames.join(', ');
    }
    
    // If we have table IDs but no names, convert IDs to table numbers
    if (tableIds && tableIds.length > 0) {
      const tableNumbers = tableIds.map(id => {
        // Extract table number from ID or use the ID directly
        const tableMatch = id.match(/table-(\d+)/i);
        if (tableMatch) {
          return `Table ${tableMatch[1]}`;
        }
        // If ID is just a number, prefix with "Table "
        if (/^\d+$/.test(id)) {
          return `Table ${id}`;
        }
        // Otherwise, try to extract any numbers from the ID
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `Table ${numberMatch[0]}`;
        }
        // Fallback to the ID itself
        return id;
      });
      return tableNumbers.join(', ');
    }
    
    return 'N/A';
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/restpossys.firebasestorage.app/o/WhatsApp%20Image%202025-10-12%20at%2006.01.10_f3bd32d3.jpg?alt=media&token=d3f11b5d-c210-4c1d-98a2-5521ff2e07fd';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Receipt size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">View Receipt</h2>
                <p className="text-sm text-gray-600">Order {order.orderNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Order Info */}
              <div>
                {/* Order Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order Number:</span>
                      <p className="font-medium">{order.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Order Type:</span>
                      <p className="font-medium capitalize">{order.orderType}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Table(s):</span>
                      <p className="font-medium">{getTableDisplay(order.tableNames, order.tableIds)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Time:</span>
                      <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Items using Grid Layout */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[2fr_60px_80px_80px] gap-2 bg-gray-50 p-3 font-medium text-sm">
                      <div>Item</div>
                      <div className="text-center">Qty</div>
                      <div className="text-right">Price</div>
                      <div className="text-right">Total</div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {order.items.map((item, index) => (
                        <div key={index} className="p-3">
                          <div className="grid grid-cols-[2fr_60px_80px_80px] gap-2 text-sm">
                            <div>
                              <p className="font-medium break-words">{item.name}</p>
                              {item.modifications && item.modifications.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.modifications.join(', ')}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-gray-500 mt-1">Note: {item.notes}</p>
                              )}
                            </div>
                            <div className="text-center flex items-center">{item.quantity}</div>
                            <div className="text-right flex items-center">₹{formatPrice(item.price)}</div>
                            <div className="text-right flex items-center font-medium">
                              ₹{formatPrice(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Receipt Preview */}
              <div>
                <h3 className="font-medium mb-3">Receipt Preview</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4" style={{ 
                    fontFamily: 'Courier New, monospace', 
                    fontSize: '11px', 
                    lineHeight: '1.3',
                    width: '100%', 
                    maxWidth: '300px', 
                    margin: '0 auto'
                  }}>
                  {/* Logo */}
                  <div className="text-center mb-3">
                    <img 
                      src={logoUrl} 
                      alt="Restaurant Logo" 
                      className="mx-auto"
                      style={{ width: '160px', height: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                  
                  {/* Header */}
                  <div className="text-center mb-3 font-bold">
                    <div className="text-sm">FORKFLOW POS</div>
                    <div className="text-xs">123 Main Street, City</div>
                    <div className="text-xs">Phone: +91 98765 43210</div>
                    <div className="text-xs">GSTIN: 123456789012345</div>
                  </div>
                  
                  <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
                    <div className="text-center text-xs">
                      <div>Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}    Time: {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div>Order: #{order.orderNumber}</div>
                      {getTableDisplay(order.tableNames, order.tableIds) !== 'N/A' && (
                        <div>Table: {getTableDisplay(order.tableNames, order.tableIds)}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Items Grid */}
                  <div className="mb-3">
                    <div className="grid grid-cols-[2fr_30px_40px_40px] gap-1 mb-1 font-bold text-xs border-b border-gray-400 pb-1">
                      <div>Item</div>
                      <div className="text-center">Qty</div>
                      <div className="text-right">Rate</div>
                      <div className="text-right">Total</div>
                    </div>
                    
                    {order.items.map((item, index) => {
                      const itemTotal = item.price * item.quantity;
                      return (
                        <div key={index} className="grid grid-cols-[2fr_30px_40px_40px] gap-1 mb-1 text-xs">
                          <div className="break-words">{item.name}</div>
                          <div className="text-center">{item.quantity}</div>
                          <div className="text-right">{formatPrice(item.price)}</div>
                          <div className="text-right">{formatPrice(itemTotal)}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
                    {/* Totals */}
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <div>Subtotal</div>
                        <div>{formatPrice(subtotal)}</div>
                      </div>
                      <div className="flex justify-between">
                        <div>CGST (2.5%)</div>
                        <div>{formatPrice(cgst)}</div>
                      </div>
                      <div className="flex justify-between">
                        <div>SGST (2.5%)</div>
                        <div>{formatPrice(sgst)}</div>
                      </div>
                      <div className="border-t border-gray-400 pt-1 flex justify-between font-bold">
                        <div>Total</div>
                        <div>{formatPrice(total)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mb-3 font-bold text-xs">
                    <div>Payment Method: {selectedPaymentMethod.toUpperCase()}</div>
                  </div>
                  
                  <div className="text-center mb-3 italic text-xs">
                    <div>Thank you for dining with us!</div>
                  </div>
                  
                  <div className="text-center font-bold text-xs">
                    <div>Powered by FORKFLOW POS</div>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST (2.5%):</span>
                    <span>₹{formatPrice(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST (2.5%):</span>
                    <span>₹{formatPrice(sgst)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">₹{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Payment Method</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'cash', label: 'Cash', icon: <DollarSign size={20} /> },
                  { value: 'card', label: 'Card', icon: <CreditCard size={20} /> },
                  { value: 'upi', label: 'UPI', icon: <Smartphone size={20} /> }
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      {method.icon}
                      <span className="text-sm font-medium">{method.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSettle}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Settling...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} />
                  <span>Settle Order</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;