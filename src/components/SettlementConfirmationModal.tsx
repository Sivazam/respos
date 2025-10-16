'use client';

import { Loader2, X, CheckCircle, User, CreditCard, Smartphone, Wallet } from 'lucide-react';
import Button from './ui/Button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface CustomerInfo {
  name?: string;
  phone?: string;
  city?: string;
}

interface SettlementConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  order?: {
    orderNumber?: string;
    orderId?: string;
    id?: string;
    tableNumber?: string;
    tableNames?: string[];
    totalAmount?: number | string;
  };
  customerInfo?: CustomerInfo;
  paymentMethod?: string;
  isProcessing?: boolean;
}

const PAYMENT_METHODS = {
  cash: { label: 'Cash', icon: Wallet, color: 'text-green-600' },
  card: { label: 'Card', icon: CreditCard, color: 'text-blue-600' },
  upi: { label: 'UPI', icon: Smartphone, color: 'text-purple-600' }
};

export default function SettlementConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  customerInfo,
  paymentMethod,
  isProcessing = false
}: SettlementConfirmationModalProps) {
  if (!isOpen) return null;

  const paymentMethodConfig = PAYMENT_METHODS[paymentMethod as keyof typeof PAYMENT_METHODS];
  const PaymentIcon = paymentMethodConfig?.icon || Wallet;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling is done by the parent component
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Confirm Settlement</h2>
              <p className="text-sm text-gray-500 mt-1">
                Please review the order details before settling
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isProcessing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Order Info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Order #{order?.orderNumber || order?.orderId || order?.id}
              </span>
              <Badge variant="outline" className="text-xs">
                Pending Settlement
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Table: {order?.tableNumber || order?.tableNames?.[0] || 'N/A'}
            </div>
            <div className="text-lg font-semibold text-gray-900 mt-2">
              Total: ₹{typeof order?.totalAmount === 'number' ? order.totalAmount.toFixed(2) : (order?.totalAmount || '0.00')}
            </div>
          </div>

          {/* Customer Information */}
          {(customerInfo?.name || customerInfo?.phone || customerInfo?.city) && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Customer Information</span>
              </div>
              {customerInfo?.name && (
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Name:</span> {customerInfo.name}
                </div>
              )}
              {customerInfo?.phone && (
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Phone:</span> {customerInfo.phone}
                </div>
              )}
              {customerInfo?.city && (
                <div className="text-sm text-blue-800">
                  <span className="font-medium">City:</span> {customerInfo.city}
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          {paymentMethod && (
            <div className="mb-6 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <PaymentIcon className={`h-4 w-4 ${paymentMethodConfig.color}`} />
                <span className="text-sm font-medium text-green-900">Payment Method</span>
              </div>
              <div className="flex items-center gap-2">
                <PaymentIcon className={`h-5 w-5 ${paymentMethodConfig.color}`} />
                <span className="text-lg font-semibold text-green-800">
                  {paymentMethodConfig.label}
                </span>
              </div>
            </div>
          )}

          {/* Warning Message */}
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Confirm Action:</strong> This will settle the order and mark it as completed. This action cannot be undone.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Settling...
                </>
              ) : (
                'Confirm Settlement'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}