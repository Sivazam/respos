import React, { useState, useEffect } from 'react';
import { X, Receipt, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import CustomerInfoForm from '../common/CustomerInfoForm';
import CustomerInfoAndPaymentModal from '../CustomerInfoAndPaymentModal';
import { upsertCustomerData, fetchCustomerDataByOrderId } from '../../contexts/CustomerDataService';
import toast from 'react-hot-toast';

interface ManagerSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettle: (order: {
    id: string;
    orderNumber: string;
    tableNames?: string[];
    tableIds?: string[];
    items: unknown[];
    totalAmount: number;
    subtotal?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    gstAmount?: number;
    total?: number;
    locationId?: string;
    customer?: {
      name?: string;
      phone?: string;
      city?: string;
      collectedBy?: 'staff' | 'manager';
      collectedAt?: number;
    };
    isStaffCreated?: boolean;
  }, paymentMethod: string, customerInfo?: {
    name?: string;
    phone?: string;
    city?: string;
  }) => void;
  order: {
    id: string;
    orderNumber: string;
    tableNames?: string[];
    tableIds?: string[];
    items: unknown[];
    totalAmount: number;
    subtotal?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    gstAmount?: number;
    total?: number;
    locationId?: string;
    customer?: {
      name?: string;
      phone?: string;
      city?: string;
      collectedBy?: 'staff' | 'manager';
      collectedAt?: number;
    };
    isStaffCreated?: boolean;
  };
}

const ManagerSettleModal: React.FC<ManagerSettleModalProps> = ({
  isOpen,
  onClose,
  onSettle,
  order
}) => {
  const { currentUser } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: ''
  });
  const [customerDataSource, setCustomerDataSource] = useState<'staff' | 'manager' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);

  // Initialize customer info from order or fetch from Firestore
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!order?.id) return;
      
      try {
        // First try to get customer data from Firestore
        const customerData = await fetchCustomerDataByOrderId(order.id);
        if (customerData) {
          setCustomerInfo({
            name: customerData.name || '',
            phone: customerData.phone || '',
            city: customerData.city || ''
          });
          setCustomerDataSource(customerData.source);
        } else if (order.customer) {
          // Fallback to order customer data
          setCustomerInfo({
            name: order.customer.name || '',
            phone: order.customer.phone || '',
            city: order.customer.city || ''
          });
          setCustomerDataSource(order.customer.collectedBy || null);
        } else {
          setCustomerInfo({ name: '', phone: '', city: '' });
          setCustomerDataSource(null);
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
        // Fallback to order customer data or empty
        if (order.customer) {
          setCustomerInfo({
            name: order.customer.name || '',
            phone: order.customer.phone || '',
            city: order.customer.city || ''
          });
          setCustomerDataSource(order.customer.collectedBy || null);
        } else {
          setCustomerInfo({ name: '', phone: '', city: '' });
          setCustomerDataSource(null);
        }
      }
    };
    
    if (isOpen && order) {
      loadCustomerData();
    }
  }, [order, isOpen]);

  // Check if we should show unified modal for manager-created orders
  useEffect(() => {
    if (isOpen && order && !order.isStaffCreated) {
      // For manager-created orders, show unified modal first
      setShowUnifiedModal(true);
    } else {
      setShowUnifiedModal(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Helper function to create customer object
  const createCustomerObject = (info: { name?: string; phone?: string; city?: string }, source: 'staff' | 'manager') => {
    return info.name || info.phone || info.city 
      ? {
          name: info.name || '',
          phone: info.phone || '',
          city: info.city || '',
          source,
          timestamp: Date.now()
        }
      : null;
  };

  // For manager-created orders, show unified modal first
  if (showUnifiedModal && !order.isStaffCreated) {
    return (
      <CustomerInfoAndPaymentModal
        isOpen={showUnifiedModal}
        onClose={() => {
          setShowUnifiedModal(false);
          onClose();
        }}
        onConfirm={handleUnifiedModalConfirm}
        order={{
          orderId: order.orderNumber,
          tableNumber: order.tableNames?.join(', ') || 'N/A',
          totalAmount: order.totalAmount || order.total
        }}
        initialCustomerInfo={customerInfo}
        initialPaymentMethod={selectedPaymentMethod}
        isStaffOrder={false}
        pendingAction="settle"
      />
    );
  }

  // Handle unified modal confirmation
  const handleUnifiedModalConfirm = async (customerData: {
    name?: string;
    phone?: string;
    city?: string;
  }, paymentMethod: string) => {
    setIsProcessing(true);
    
    try {
      // Create customer object if any customer info is provided
      const customerObject = createCustomerObject(customerData, 'manager');
      
      // Update customer data if provided
      if (customerObject && (customerData.name || customerData.phone || customerData.city)) {
        try {
          await upsertCustomerData(
            order.id, 
            customerData, 
            'manager', 
            Date.now(),
            currentUser?.uid || 'unknown',
            order.locationId || 'unknown'
          );
          console.log('✅ Customer data updated successfully');
        } catch (customerDataError) {
          console.error('❌ Failed to update customer data:', customerDataError);
          // Don't fail the settlement, just log the error
        }
      }

      // Update local state
      setCustomerInfo(customerData);
      setSelectedPaymentMethod(paymentMethod);
      setShowUnifiedModal(false);

      // Call the settle callback with updated order info
      onSettle(
        {
          ...order,
          customer: customerObject || order.customer
        },
        paymentMethod,
        customerData
      );
      
      onClose();
    } catch (error) {
      console.error('Error settling order:', error);
      toast.error('Failed to settle order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettle = async () => {
    setIsProcessing(true);
    
    try {
      // Create customer object if any customer info is provided
      const customerObject = createCustomerObject(customerInfo, 'manager');
      
      // Update customer data if provided
      if (customerObject && (customerInfo.name || customerInfo.phone || customerInfo.city)) {
        try {
          await upsertCustomerData(
            order.id, 
            customerInfo, 
            'manager', 
            Date.now(),
            currentUser?.uid || 'unknown',
            order.locationId || 'unknown'
          );
          console.log('✅ Customer data updated successfully');
        } catch (customerDataError) {
          console.error('❌ Failed to update customer data:', customerDataError);
          // Don't fail the settlement, just log the error
        }
      }

      // Call the settle callback with updated order info
      onSettle(
        {
          ...order,
          customer: customerObject || order.customer
        },
        selectedPaymentMethod,
        customerInfo
      );
      
      onClose();
    } catch (error) {
      console.error('Error settling order:', error);
      toast.error('Failed to settle order');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '0';
    }
    return Math.round(price).toString();
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: DollarSign, color: 'green' },
    { id: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
    { id: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' }
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Receipt size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Settle Order</h2>
                <p className="text-sm text-gray-600">Review customer info and collect payment</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Left Column - Customer Information */}
            <div className="space-y-6">
              {/* Customer Info Form */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  {customerDataSource && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <User size={12} className="mr-1" />
                      {customerDataSource === 'staff' ? 'Collected by Staff' : 'Collected by Manager'}
                    </div>
                  )}
                </div>
                <CustomerInfoForm
                  name={customerInfo.name}
                  phone={customerInfo.phone}
                  city={customerInfo.city}
                  onChange={setCustomerInfo}
                  disabled={isProcessing}
                  showCollectedStatus={!!customerDataSource}
                  collectedBy={customerDataSource}
                />
              </div>

              {/* Payment Method Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Method</h3>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPaymentMethod(method.id as any)}
                        disabled={isProcessing}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedPaymentMethod === method.id
                            ? `border-${method.color}-500 bg-${method.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={24} className={`mx-auto mb-2 text-${method.color}-600`} />
                        <div className="text-sm font-medium">{method.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Order Summary</h3>
                
                {/* Order Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Order Number:</span>
                      <div className="font-medium">{order.orderNumber}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Table:</span>
                      <div className="font-medium">{order.tableNames?.join(', ') || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-3">Items</h4>
                  <div className="space-y-2">
                    {order.items.map((item: unknown, index: number) => {
                      const typedItem = item as {
                        name: string;
                        quantity: number;
                        price: number;
                        portionSize?: string;
                      };
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <span className="font-medium">{typedItem.name}</span>
                            {typedItem.quantity > 1 && (
                              <span className="text-gray-500 ml-1">x{typedItem.quantity}</span>
                            )}
                            {typedItem.portionSize === 'half' && (
                              <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded">Half</span>
                            )}
                          </div>
                          <span className="font-medium">₹{formatPrice(typedItem.price * typedItem.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="border rounded-lg p-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{formatPrice(order.subtotal || order.totalAmount)}</span>
                    </div>
                    {(order.cgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>CGST</span>
                        <span>₹{formatPrice(order.cgstAmount)}</span>
                      </div>
                    )}
                    {(order.sgstAmount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>SGST</span>
                        <span>₹{formatPrice(order.sgstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span className="text-green-600">₹{formatPrice(order.totalAmount || order.total)}</span>
                    </div>
                  </div>
                </div>
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
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold text-lg">₹{formatPrice(order.totalAmount || order.total)}</span>
              </div>
              
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
                    <Receipt size={16} />
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

export default ManagerSettleModal;