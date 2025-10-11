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
import { Card } from '../ui/card';

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

  const subtotal = calculateSubtotal();
  const gst = calculateGST();
  const total = subtotal + gst;

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
                  <p className="font-medium">{order.tableNames.join(', ')}</p>
                </div>
                <div>
                  <span className="text-gray-600">Time:</span>
                  <p className="font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Order Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Item</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Price</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.modifications && item.modifications.length > 0 && (
                              <p className="text-xs text-gray-500">
                                {item.modifications.join(', ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-gray-500">Note: {item.notes}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{item.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (5%):</span>
                <span>₹{gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
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