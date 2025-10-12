import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2, Save } from 'lucide-react';
import Button from '../ui/Button';
import { Card } from '../ui/card';
import { OrderItem } from '../../types';
import { useLocations } from '../../contexts/LocationContext';
import { SetupService } from '../../services/setupService';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    items: OrderItem[];
    notes?: string;
    customerName?: string;
    locationId?: string;
  };
  onSave: (updatedOrder: {
    items: OrderItem[];
    notes?: string;
    customerName?: string;
    totalAmount: number;
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    gstAmount: number;
  }) => void;
  menuItems: any[];
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
  menuItems
}) => {
  const { currentLocation } = useLocations();
  const [editedItems, setEditedItems] = useState<OrderItem[]>(order?.items || []);
  const [editedNotes, setEditedNotes] = useState(order?.notes || '');
  const [editedCustomerName, setEditedCustomerName] = useState(order?.customerName || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gstSettings, setGstSettings] = useState({ cgst: 0, sgst: 0 });

  // Load GST settings for the location
  useEffect(() => {
    const loadGstSettings = async () => {
      const locationId = order?.locationId || currentLocation?.id;
      if (locationId) {
        try {
          const result = await SetupService.getLocationSettings(locationId);
          if (result.success && result.settings?.tax) {
            setGstSettings({
              cgst: result.settings.tax.cgst || 2.5,
              sgst: result.settings.tax.sgst || 2.5
            });
          }
        } catch (error) {
          console.error('Error loading GST settings:', error);
        }
      }
    };
    
    if (isOpen) {
      loadGstSettings();
    }
  }, [isOpen, order?.locationId, currentLocation?.id]);

  if (!isOpen) return null;

  const handleQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const updatedItems = [...editedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    setEditedItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(updatedItems);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const subtotal = calculateSubtotal();
      const gstCalculation = calculateGST(subtotal);
      
      const updatedOrder = {
        ...order,
        items: editedItems,
        notes: editedNotes,
        customerName: editedCustomerName,
        subtotal,
        cgstAmount: gstCalculation.cgstAmount,
        sgstAmount: gstCalculation.sgstAmount,
        gstAmount: gstCalculation.totalGST,
        totalAmount: subtotal + gstCalculation.totalGST
      };
      await onSave(updatedOrder);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateSubtotal = () => {
    return editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateGST = (subtotal: number) => {
    const cgstAmount = subtotal * (gstSettings.cgst / 100);
    const sgstAmount = subtotal * (gstSettings.sgst / 100);
    return {
      cgstAmount,
      sgstAmount,
      totalGST: cgstAmount + sgstAmount
    };
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const gstCalculation = calculateGST(subtotal);
    return subtotal + gstCalculation.totalGST;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Edit3 size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Order</h2>
                <p className="text-sm text-gray-600">Order {order?.orderNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Edit Content */}
          <div className="p-6">
            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={editedCustomerName}
                    onChange={(e) => setEditedCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Order Items</h3>
              <div className="space-y-3">
                {editedItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
                        {item.modifications && item.modifications.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Modifications: {item.modifications.join(', ')}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(index, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
                
                {editedItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items in order
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Notes
              </label>
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any special notes..."
              />
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ₹{calculateSubtotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">CGST ({gstSettings.cgst}%):</span>
                  <span className="font-medium">
                    ₹{calculateGST(calculateSubtotal()).cgstAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">SGST ({gstSettings.sgst}%):</span>
                  <span className="font-medium">
                    ₹{calculateGST(calculateSubtotal()).sgstAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total GST:</span>
                  <span className="font-medium text-orange-600">
                    ₹{calculateGST(calculateSubtotal()).totalGST.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-lg font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
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
            
            <Button
              onClick={handleSave}
              disabled={isProcessing || editedItems.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save size={16} />
                  <span>Save Changes</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;