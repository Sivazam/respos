import React from 'react';
import { X, CreditCard, Smartphone, Wallet } from 'lucide-react';
import Button from '../ui/Button';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (paymentMethod: 'cash' | 'card' | 'upi') => void;
  isProcessing?: boolean;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: 'cash' as const,
      name: 'Cash',
      icon: Wallet,
      description: 'Pay with cash'
    },
    {
      id: 'card' as const,
      name: 'Card',
      icon: CreditCard,
      description: 'Pay with credit/debit card'
    },
    {
      id: 'upi' as const,
      name: 'UPI',
      icon: Smartphone,
      description: 'Pay with UPI'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Select Payment Method
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => onSelect(method.id)}
                    disabled={isProcessing}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="ml-4 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {method.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {method.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;