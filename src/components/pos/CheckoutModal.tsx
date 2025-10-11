import React, { useState } from 'react';
import { Sale } from '../../types';
import Button from '../ui/Button';

interface CheckoutModalProps {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  cgstRate: number;
  sgstRate: number;
  onConfirm: (paymentMethod: Sale['paymentMethod']) => void;
  onCancel: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  subtotal,
  cgst,
  sgst,
  total,
  cgstRate,
  sgstRate,
  onConfirm,
  onCancel
}) => {
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('cash');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-scaleIn">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Complete Sale</h2>

          {/* Payment Summary */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              
              {/* Only show GST if rates are greater than 0 */}
              {cgstRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span>CGST ({(cgstRate * 100).toFixed(1)}%)</span>
                  <span>₹{cgst.toFixed(2)}</span>
                </div>
              )}
              
              {sgstRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span>SGST ({(sgstRate * 100).toFixed(1)}%)</span>
                  <span>₹{sgst.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-base sm:text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`
                  p-3 sm:p-4 text-center rounded-lg border-2 transition-all duration-200
                  ${paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 transform scale-105'
                    : 'border-gray-200 hover:border-green-200'
                  }
                `}
              >
                <span className="block text-lg mb-1">💵</span>
                <span className="text-xs sm:text-sm font-medium">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`
                  p-3 sm:p-4 text-center rounded-lg border-2 transition-all duration-200
                  ${paymentMethod === 'card'
                    ? 'border-green-500 bg-green-50 transform scale-105'
                    : 'border-gray-200 hover:border-green-200'
                  }
                `}
              >
                <span className="block text-lg mb-1">💳</span>
                <span className="text-xs sm:text-sm font-medium">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`
                  p-3 sm:p-4 text-center rounded-lg border-2 transition-all duration-200
                  ${paymentMethod === 'upi'
                    ? 'border-green-500 bg-green-50 transform scale-105'
                    : 'border-gray-200 hover:border-green-200'
                  }
                `}
              >
                <span className="block text-lg mb-1">📱</span>
                <span className="text-xs sm:text-sm font-medium">UPI</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => onConfirm(paymentMethod)}
              className="w-full sm:w-auto"
            >
              Complete Sale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;