import React from 'react';
import { DollarSign } from 'lucide-react';
import Button from '../ui/Button';

interface PaymentReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

const PaymentReceivedModal: React.FC<PaymentReceivedModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-center items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                Payment Confirmation
              </h3>
              <p className="text-sm text-gray-500">
                Is the payment received?
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Processing...' : 'Yes'}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              No
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceivedModal;