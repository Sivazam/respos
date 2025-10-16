import React, { useState, useEffect } from 'react';
import { X, Receipt, ArrowRight, AlertCircle, User, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTables } from '../../contexts/TableContext';
import { upsertCustomerData } from '../../contexts/CustomerDataService';
import CustomerInfoForm from '../common/CustomerInfoForm';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

interface GoForBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: any; // The order to transfer
}

const GoForBillModal: React.FC<GoForBillModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const { currentUser } = useAuth();
  const { transferOrderToManager } = useTemporaryOrder();
  const { releaseTable } = useTables();

  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'upi'
  });

  // Pre-fill customer name with delivery type for delivery orders
  useEffect(() => {
    if (isOpen && order) {
      if (order.orderType === 'delivery' && order.orderMode) {
        // Set the delivery type as the default customer name
        const deliveryTypeName = order.orderMode.charAt(0).toUpperCase() + order.orderMode.slice(1);
        setCustomerInfo(prev => ({
          ...prev,
          name: deliveryTypeName
        }));
        console.log('🛵 Pre-filled customer name with delivery type:', deliveryTypeName);
      } else {
        // Reset to empty for non-delivery orders
        setCustomerInfo(prev => ({
          ...prev,
          name: ''
        }));
      }
    }
  }, [isOpen, order]);

  const handleCustomerInfoChange = (values: { name?: string; phone?: string; city?: string }) => {
    setCustomerInfo(prev => ({
      ...prev,
      ...values
    }));
  };

  const handlePaymentMethodChange = (paymentMethod: 'cash' | 'card' | 'upi') => {
    setCustomerInfo(prev => ({
      ...prev,
      paymentMethod
    }));
  };

  if (!isOpen || !order) return null;

  const handleTransferToManager = async () => {
    console.log('🔍 Transfer function called - checking prerequisites...');
    console.log('👤 Current user object:', currentUser);
    console.log('📋 Order object:', order);
    console.log('👥 Customer info:', customerInfo);
    
    if (!currentUser) {
      console.error('❌ Cannot transfer: currentUser is null or undefined');
      toast.error('Cannot transfer: User not authenticated. Please log in again.');
      return;
    }

    if (!order) {
      console.error('❌ Cannot transfer: order is null or undefined');
      toast.error('Cannot transfer: Order information missing');
      return;
    }

    if (!currentUser.uid) {
      console.error('❌ Cannot transfer: currentUser.uid is undefined', { 
        currentUser: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          role: currentUser.role
        }
      });
      toast.error('Cannot transfer: User ID not available. Please log in again.');
      return;
    }

    console.log('🚀 Starting transfer process for order:', order);
    console.log('👤 Current user:', currentUser);
    console.log('👥 Customer info:', customerInfo);
    console.log('📋 Order details:', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableIds: order.tableIds,
      totalAmount: order.totalAmount
    });
    
    setIsProcessing(true);

    try {
      // Create customer object if any customer info is provided
      const customerObject = customerInfo.name || customerInfo.phone || customerInfo.city 
        ? {
            name: customerInfo.name || '',
            phone: customerInfo.phone || '',
            city: customerInfo.city || '',
            paymentMethod: customerInfo.paymentMethod,
            source: 'staff' as const,
            timestamp: Date.now()
          }
        : null;
      
      // Update order with customer info if provided
      if (customerObject) {
        order.customer = customerObject;
        console.log('👤 Added customer info to order:', customerObject);
      }

      // Check localStorage before transfer
      console.log('🔍 Checking localStorage before transfer...');
      const beforeKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_order_') || key.startsWith('manager_pending_'))) {
          beforeKeys.push(key);
          console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
        }
      }

      // Transfer order to manager's pending orders
      console.log('📤 Calling transferOrderToManager with order ID:', order.id, 'and staff ID:', currentUser.uid);
      
      try {
        const result = await transferOrderToManager(order.id, currentUser.uid, '', customerObject);
        console.log('✅ Transfer function completed successfully:', result);
      } catch (transferError) {
        console.error('❌ Transfer function failed:', transferError);
        throw transferError;
      }

      // Save customer data to customer_data collection if customer info is provided
      if (customerInfo.name || customerInfo.phone || customerInfo.city) {
        try {
          console.log('🔍 Debug - Saving customer data with:', {
            orderId: order.id,
            customerInfo,
            userId: currentUser.uid,
            locationId: order.locationId
          });
          await upsertCustomerData(order.id, {
            name: customerInfo.name,
            phone: customerInfo.phone,
            city: customerInfo.city,
            paymentMethod: customerInfo.paymentMethod
          }, 'staff', Date.now(), currentUser.uid || 'unknown', order.locationId || 'unknown');
          console.log('✅ Customer data saved successfully');
        } catch (error) {
          console.error('❌ Error saving customer data:', error);
          // Don't fail the transfer if customer data save fails
        }
      }

      // Check localStorage after transfer
      console.log('🔍 Checking localStorage after transfer...');
      const afterKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_order_') || key.startsWith('manager_pending_'))) {
          afterKeys.push(key);
          console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
        }
      }

      // Compare before and after
      const newKeys = afterKeys.filter(key => !beforeKeys.includes(key));
      console.log('🆕 New keys created:', newKeys);
      
      if (newKeys.length === 0) {
        console.warn('⚠️ No new keys were created during transfer!');
      }

      // Release the tables after successful transfer
      if (order.tableIds && order.tableIds.length > 0) {
        console.log('🪑 Releasing tables:', order.tableIds);
        for (const tableId of order.tableIds) {
          try {
            await releaseTable(tableId);
            console.log(`✅ Successfully released table ${tableId} after transfer`);
          } catch (error) {
            console.error(`❌ Failed to release table ${tableId}:`, error);
          }
        }
      }

      toast.success('Order transferred to Manager for billing');
      
      console.log('✅ Transfer process completed successfully');
      
      // Close modal immediately
      onClose();
      
      // Note: We don't call onSuccess callback here because the transfer is already handled
      // The calling component should refresh its orders list based on the modal closing
      
    } catch (error) {
      console.error('❌ Error transferring order to manager:', error);
      toast.error(`Failed to transfer order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Receipt size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Go for Bill</h2>
                <p className="text-sm text-gray-600">Transfer order to Manager</p>
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
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <ArrowRight className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Transfer to Manager
              </h3>
              <p className="text-sm text-gray-500">
                This will transfer <span className="font-semibold">{order.orderNumber}</span> to the Manager's pending orders queue for billing and settlement.
              </p>
            </div>

            {/* Customer Information Form */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <User size={16} className="text-gray-600" />
                <h4 className="font-medium text-gray-900">Customer Information (Optional)</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <CustomerInfoForm
                  name={customerInfo.name}
                  phone={customerInfo.phone}
                  city={customerInfo.city}
                  onChange={handleCustomerInfoChange}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <Wallet size={16} className="text-gray-600" />
                <h4 className="font-medium text-gray-900">Payment Method</h4>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-3">
                  {[
                    { value: 'cash', label: 'Cash', icon: Wallet, color: 'text-green-600' },
                    { value: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600' },
                    { value: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600' }
                  ].map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <label key={method.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={customerInfo.paymentMethod === method.value}
                          onChange={(e) => handlePaymentMethodChange(e.target.value as 'cash' | 'card' | 'upi')}
                          disabled={isProcessing}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <IconComponent className={`h-4 w-4 ${method.color}`} />
                        <span className="text-sm font-medium">{method.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Table(s):</span>
                  <span className="font-medium">{order.tableNames?.join(', ') || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{order.items?.length || 0} items</span>
                </div>
                <div className="flex justify-between font-semibold text-base border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              
              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2 text-sm">Order Items:</h5>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs bg-white p-2 rounded border">
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          {item.quantity > 1 && (
                            <span className="text-gray-500 ml-1">x{item.quantity}</span>
                          )}
                          {item.notes && (
                            <p className="text-gray-500 text-xs mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} className="text-blue-600" />
                <p className="text-sm text-blue-700">
                  Once transferred, you won't be able to edit this order. The Manager will handle billing and payment collection.
                </p>
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
              onClick={handleTransferToManager}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Transferring...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ArrowRight size={16} />
                  <span>Transfer to Manager</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoForBillModal;