import React from 'react';
import { MenuItem } from '../../types';
import { X, IndianRupee } from 'lucide-react';
import Button from '../ui/Button';

interface PortionSelectionModalProps {
  menuItem: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (portionSize: 'half' | 'full', price: number) => void;
}

const PortionSelectionModal: React.FC<PortionSelectionModalProps> = ({
  menuItem,
  isOpen,
  onClose,
  onSelect
}) => {
  if (!isOpen) return null;

  const handleSelect = (portionSize: 'half' | 'full') => {
    const price = portionSize === 'half' 
      ? menuItem.halfPortionCost || 0 
      : menuItem.price;
    onSelect(portionSize, price);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Select Portion Size</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-1">{menuItem.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{menuItem.description}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSelect('full')}
              className="w-full p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Full Portion</div>
                  <div className="text-sm text-gray-500">Regular size</div>
                </div>
                <div className="flex items-center text-lg font-bold text-green-600">
                  <IndianRupee size={16} className="mr-1" />
                  {menuItem.price.toFixed(2)}
                </div>
              </div>
            </button>

            {menuItem.hasHalfPortion && (
              <button
                onClick={() => handleSelect('half')}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Half Portion</div>
                    <div className="text-sm text-gray-500">Smaller size</div>
                  </div>
                  <div className="flex items-center text-lg font-bold text-green-600">
                    <IndianRupee size={16} className="mr-1" />
                    {menuItem.halfPortionCost?.toFixed(2)}
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PortionSelectionModal;