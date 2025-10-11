import React, { useState } from 'react';
import { X, Utensils, Package, Clock, Plus } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (orderType: 'dinein' | 'delivery', isOngoing?: boolean) => void;
}

const OrderTypeSelection: React.FC<OrderTypeSelectionProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [selectedFlow, setSelectedFlow] = useState<'new' | 'ongoing' | null>(null);

  const handleFlowSelect = (flow: 'new' | 'ongoing') => {
    setSelectedFlow(flow);
  };

  const handleOrderTypeSelect = (orderType: 'dinein' | 'delivery') => {
    onSelect(orderType, selectedFlow === 'ongoing');
    setSelectedFlow(null);
  };

  const handleClose = () => {
    setSelectedFlow(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Start Order</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!selectedFlow ? (
              /* Order Flow Selection */
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Order Type</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleFlowSelect('new')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                        <Plus size={24} className="text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-green-700">
                          New Order
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Start a fresh order for new customers
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleFlowSelect('ongoing')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                        <Clock size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                          Ongoing Order
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Add items to existing table orders
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Order Type Selection */
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <button
                    onClick={() => setSelectedFlow(null)}
                    className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors mr-3"
                  >
                    <X size={16} />
                  </button>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedFlow === 'new' ? 'New Order' : 'Ongoing Order'} - Select Type
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleOrderTypeSelect('dinein')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-orange-100 rounded-full group-hover:bg-orange-200 transition-colors">
                        <Utensils size={24} className="text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-orange-700">
                          Dine-in
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Customer will dine at the restaurant
                        </p>
                        {selectedFlow === 'new' && (
                          <p className="text-xs text-orange-600 mt-2">
                            Available and reserved tables will be shown
                          </p>
                        )}
                        {selectedFlow === 'ongoing' && (
                          <p className="text-xs text-blue-600 mt-2">
                            Occupied tables with ongoing orders will be shown
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleOrderTypeSelect('delivery')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                        <Package size={24} className="text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700">
                          Delivery
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Order for home/office delivery
                        </p>
                        <p className="text-xs text-purple-600 mt-2">
                          No table selection required
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTypeSelection;