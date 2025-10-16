import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, ArrowRight } from 'lucide-react';
import { fetchCustomerDataByOrderId, upsertCustomerData } from '../../contexts/CustomerDataService';
import CustomerInfoForm from '../common/CustomerInfoForm';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber: string;
    customer?: {
      name?: string;
      phone?: string;
      city?: string;
      collectedBy?: 'staff' | 'manager';
    };
  };
  onProceed: (customerData: { name?: string; phone?: string; city?: string }) => void;
}

const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  isOpen,
  onClose,
  order,
  onProceed
}) => {
  const { currentUser } = useAuth();
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    city: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDataSource, setCustomerDataSource] = useState<'staff' | 'manager' | null>(null);

  // Load existing customer data when modal opens
  useEffect(() => {
    if (isOpen && order?.id) {
      const loadCustomerData = async () => {
        setIsLoading(true);
        try {
          const customerData = await fetchCustomerDataByOrderId(order.id);
          if (customerData) {
            setCustomerInfo({
              name: customerData.name || '',
              phone: customerData.phone || '',
              city: customerData.city || ''
            });
            setCustomerDataSource(customerData.source);
          } else if (order.customer) {
            // Use customer data from order if available
            setCustomerInfo({
              name: order.customer.name || '',
              phone: order.customer.phone || '',
              city: order.customer.city || ''
            });
            setCustomerDataSource(order.customer.collectedBy || null);
          } else {
            setCustomerDataSource(null);
          }
        } catch (error) {
          console.error('Error loading customer data:', error);
          setCustomerDataSource(null);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadCustomerData();
    }
  }, [isOpen, order?.id, order.customer]);

  const handleProceed = async () => {
    setIsSubmitting(true);
    try {
      // Save customer data before proceeding
      if (customerInfo.name || customerInfo.phone || customerInfo.city) {
        console.log('🔍 Debug - CustomerInfoModal saving data with:', {
          orderId: order.id,
          customerInfo,
          userId: currentUser?.uid,
          locationId: order.locationId
        });
        await upsertCustomerData(order.id, customerInfo, 'manager', Date.now(), currentUser?.uid || 'unknown', order.locationId || 'unknown');
        console.log('✅ Customer data saved/updated by manager');
      }

      onProceed(customerInfo);
    } catch (error) {
      console.error('Error saving customer data:', error);
      toast.error('Failed to save customer information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasExistingData = customerDataSource || (customerInfo.name || customerInfo.phone || customerInfo.city);

  if (!isOpen) return null;

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
                <User size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading customer information...</span>
              </div>
            ) : (
              <>
                {/* Status Badge */}
                {hasExistingData && (
                  <div className="mb-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <User size={12} className="mr-1" />
                      {customerDataSource === 'staff' ? 'Collected by Staff' : 
                       customerDataSource === 'manager' ? 'Collected by Manager' : 
                       'Customer Information Available'}
                    </div>
                  </div>
                )}

                {/* Customer Information Form */}
                <div className="mb-6">
                  <CustomerInfoForm
                    name={customerInfo.name}
                    phone={customerInfo.phone}
                    city={customerInfo.city}
                    onChange={setCustomerInfo}
                    disabled={isSubmitting}
                    showCollectedStatus={hasExistingData}
                    collectedBy={customerDataSource}
                  />
                </div>

                {/* Info Note */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-blue-600" />
                    <p className="text-sm text-blue-700">
                      Customer information is optional. You can proceed without filling these details.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleProceed}
              disabled={isSubmitting || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CreditCard size={16} />
                  <span>Proceed to Payment</span>
                  <ArrowRight size={16} />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoModal;