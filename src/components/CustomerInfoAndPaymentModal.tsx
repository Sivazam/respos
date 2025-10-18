'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, User, CreditCard, Smartphone, Wallet } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface CustomerInfo {
  phone?: string;
}

interface CustomerInfoAndPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerInfo: CustomerInfo, paymentMethod: string) => Promise<void>;
  order?: {
    orderNumber?: string;
    orderId?: string;
    id?: string;
    tableNumber?: string;
    tableNames?: string[];
    totalAmount?: number | string;
  };
  initialCustomerInfo?: CustomerInfo;
  initialPaymentMethod?: string;
  isStaffOrder?: boolean;
  pendingAction?: 'print' | 'settle';
  dataSource?: 'staff' | 'manager';
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Wallet, color: 'text-green-600' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600' },
  { value: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600' }
];

export default function CustomerInfoAndPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  initialCustomerInfo,
  initialPaymentMethod = 'cash',
  isStaffOrder = false,
  pendingAction,
  dataSource
}: CustomerInfoAndPaymentModalProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod || 'cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);

  // Initialize form with existing data or fetch from Firestore
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!isOpen) return;
      
      setLoadingCustomerData(true);
      try {
        // If we have initial customer info, use it
        if (initialCustomerInfo) {
          setCustomerInfo({
            phone: initialCustomerInfo.phone || ''
          });
        } else if (order?.id || order?.orderId) {
          // Try to fetch customer data from Firestore
          const { fetchCustomerDataByOrderId } = await import('../contexts/CustomerDataService');
          const orderId = order.id || order.orderId;
          const customerData = await fetchCustomerDataByOrderId(orderId);
          
          if (customerData) {
            setCustomerInfo({
              phone: customerData.phone || ''
            });
          }
        }
      } catch (error) {
        console.error('Error loading customer data:', error);
      } finally {
        setLoadingCustomerData(false);
      }
    };

    loadCustomerData();
  }, [isOpen, order?.id, order?.orderId, initialCustomerInfo]);

  // Initialize payment method
  useEffect(() => {
    if (initialPaymentMethod) {
      setPaymentMethod(initialPaymentMethod);
    }
  }, [initialPaymentMethod]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerInfo({ phone: '' });
      setPaymentMethod(initialPaymentMethod || 'cash');
      setIsSubmitting(false);
      setLoadingCustomerData(false);
    }
  }, [isOpen, initialPaymentMethod]);

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(customerInfo, paymentMethod);
      // Only close if onConfirm was successful
      onClose();
    } catch (error) {
      console.error('Failed to process:', error);
      // Don't close on error, let user try again
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionText = () => {
    switch (pendingAction) {
      case 'print':
        return 'Print Receipt';
      case 'settle':
        return 'Settle Bill';
      default:
        return 'Confirm & Proceed';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customer Info & Payment</h2>
              <p className="text-sm text-gray-500 mt-1">
                {isStaffOrder ? 'Staff order - you can edit if needed' : 'Enter customer details (optional)'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Order Info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Order #{order?.orderNumber || order?.orderId || order?.id}</span>
              <div className="flex gap-2">
                {dataSource && (
                  <Badge variant="secondary" className="text-xs">
                    {dataSource === 'staff' ? 'Collected by Staff' : 'Collected by Manager'}
                  </Badge>
                )}
                {isStaffOrder && (
                  <Badge variant="outline" className="text-xs">
                    Staff Order
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Table: {order?.tableNumber || order?.tableNames?.[0] || 'N/A'} • Amount: ₹{typeof order?.totalAmount === 'number' ? order.totalAmount.toFixed(2) : (order?.totalAmount || '0.00')}
            </div>
          </div>

          {/* Customer Information Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-700">Customer Information</Label>
              <span className="text-xs text-gray-500">(Optional)</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="text-sm text-gray-600 mb-1 block">
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter phone number"
                  value={customerInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting || loadingCustomerData}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          {/* Payment Method Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const IconComponent = method.icon;
                return (
                  <div key={method.value} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id={method.value}
                      name="paymentMethod"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={isSubmitting || loadingCustomerData}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <Label
                      htmlFor={method.value}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      <IconComponent className={`h-4 w-4 ${method.color}`} />
                      <span className="text-sm font-medium">{method.label}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                getActionText()
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}