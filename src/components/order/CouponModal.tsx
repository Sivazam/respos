import React, { useState } from 'react';
import { 
  Tag, 
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon: (couponName: string, couponAmount: number) => void;
  orderSubtotal: number;
  existingCoupon?: {
    name: string;
    amount: number;
  };
}

const CouponModal: React.FC<CouponModalProps> = ({
  isOpen,
  onClose,
  onApplyCoupon,
  orderSubtotal,
  existingCoupon
}) => {
  const [couponName, setCouponName] = useState(existingCoupon?.name || '');
  const [couponAmount, setCouponAmount] = useState(existingCoupon?.amount?.toString() || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!couponName.trim()) {
      setError('Coupon name is required');
      return;
    }

    const amount = parseFloat(couponAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid coupon amount');
      return;
    }

    if (amount > orderSubtotal) {
      setError('Coupon amount cannot exceed the subtotal');
      return;
    }

    onApplyCoupon(couponName.trim(), amount);
    handleClose();
  };

  const handleClose = () => {
    setCouponName('');
    setCouponAmount('');
    setError('');
    onClose();
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon('', 0);
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">
              {existingCoupon ? 'Edit Coupon' : 'Apply Coupon'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coupon Name
              </label>
              <Input
                type="text"
                value={couponName}
                onChange={(e) => setCouponName(e.target.value)}
                placeholder="e.g., WELCOME10, SPECIAL20"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Amount (₹)
              </label>
              <Input
                type="number"
                value={couponAmount}
                onChange={(e) => setCouponAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={orderSubtotal}
                step="0.01"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Order subtotal: ₹{orderSubtotal.toFixed(2)}
              </p>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {existingCoupon && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Current Coupon
                    </p>
                    <p className="text-sm text-orange-600">
                      {existingCoupon.name} - ₹{existingCoupon.amount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {existingCoupon ? 'Update Coupon' : 'Apply Coupon'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponModal;