import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Wallet } from 'lucide-react';
import { OrderItem } from '../../types';
import Button from '../ui/Button';
import { Card } from '../ui/card';
import CustomerInfoForm from '../common/CustomerInfoForm';
import { upsertCustomerData, fetchCustomerDataByOrderId } from '../../contexts/CustomerDataService';
import { useAuth } from '../../contexts/AuthContext';

interface SettleBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (paymentData: any) => void;
  isProcessing: boolean;
}

const SettleBillModal: React.FC<SettleBillModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
  isProcessing
}) => {
  const { currentUser } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: ''
  });
  const [existingCustomerData, setExistingCustomerData] = useState<any>(null);

  // Load existing customer data when modal opens
  useEffect(() => {
    if (isOpen && order?.id) {
      const loadCustomerData = async () => {
        try {
          const customerData = await fetchCustomerDataByOrderId(order.id);
          if (customerData) {
            setExistingCustomerData(customerData);
            setCustomerInfo({
              name: customerData.name || '',
              phone: customerData.phone || '',
              city: customerData.city || ''
            });
          } else {
            // Reset form if no existing data
            setCustomerInfo({
              name: '',
              phone: '',
              city: ''
            });
            setExistingCustomerData(null);
          }
        } catch (error) {
          console.error('Error loading customer data:', error);
        }
      };
      
      loadCustomerData();
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const calculateSubtotal = () => {
    return order.items.reduce((sum: number, item: OrderItem) => sum + (item.price * item.quantity), 0);
  };

  const calculateGST = () => {
    return calculateSubtotal() * 0.05; // 5% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const calculateChange = () => {
    if (!receivedAmount || paymentMethod !== 'cash') return 0;
    const received = parseFloat(receivedAmount);
    return isNaN(received) ? 0 : received - calculateTotal();
  };

  const handleSubmit = async () => {
    // Save customer data if provided
    if (customerInfo.name || customerInfo.phone || customerInfo.city) {
      try {
        await upsertCustomerData(
          order.id,
          customerInfo,
          'manager',
          Date.now(),
          currentUser?.uid || 'unknown',
          order.locationId || 'unknown',
          currentUser?.franchiseId
        );
        console.log('✅ Customer data saved for order:', order.id);
      } catch (error) {
        console.error('❌ Error saving customer data:', error);
        // Don't fail the settlement if customer data save fails
      }
    }

    const paymentData = {
      method: paymentMethod,
      amount: calculateTotal(),
      receivedAmount: paymentMethod === 'cash' ? parseFloat(receivedAmount) || calculateTotal() : calculateTotal(),
      change: paymentMethod === 'cash' ? calculateChange() : 0,
      notes,
      customer: customerInfo.name || customerInfo.phone || customerInfo.city ? {
        ...customerInfo,
        collectedBy: 'manager' as const,
        collectedAt: Date.now()
      } : undefined
    };

    onSuccess(paymentData);
  };

  const isFormValid = () => {
    if (paymentMethod === 'cash') {
      return receivedAmount && parseFloat(receivedAmount) >= calculateTotal();
    }
    return true;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign size={20} />;
      case 'card':
        return <CreditCard size={20} />;
      case 'upi':
        return <Smartphone size={20} />;
      default:
        return <Wallet size={20} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Settle Bill - {order.orderNumber}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Details */}
          <div>
            <h3 className="font-medium mb-3">Order Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Table:</span>
                <span className="font-medium">{order.tableNames?.join(', ') || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Items:</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">{order.staffId || 'N/A'}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <CustomerInfoForm
              name={customerInfo.name}
              phone={customerInfo.phone}
              city={customerInfo.city}
              onChange={setCustomerInfo}
              disabled={isProcessing}
              showCollectedBadge={!!existingCustomerData}
              collectedBy={existingCustomerData?.source}
            />
          </div>

          {/* Items */}
          <div>
            <h3 className="font-medium mb-3">Items</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              {order.items.map((item: OrderItem, index: number) => (
                <div key={index} className="flex justify-between py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      {item.quantity} x ₹{item.price.toFixed(2)}
                    </div>
                    {item.notes && (
                      <div className="text-sm text-gray-500 italic">Note: {item.notes}</div>
                    )}
                  </div>
                  <div className="font-medium">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary */}
          <div>
            <h3 className="font-medium mb-3">Bill Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (5%):</span>
                <span>₹{calculateGST().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h3 className="font-medium mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['cash', 'card', 'upi'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === method
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {getPaymentIcon(method)}
                    <span className="font-medium capitalize">{method}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div>
              <h3 className="font-medium mb-3">Cash Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Amount
                  </label>
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="Enter amount received"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={calculateTotal()}
                    step="0.01"
                  />
                </div>
                
                {receivedAmount && parseFloat(receivedAmount) > calculateTotal() && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-green-800">Change to return:</span>
                      <span className="font-semibold text-green-800">
                        ₹{calculateChange().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any payment notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!isFormValid() || isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                `Settle Bill - ₹${calculateTotal().toFixed(2)}`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettleBillModal;