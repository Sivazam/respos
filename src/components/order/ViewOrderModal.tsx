import React, { useEffect, useState } from 'react';
import { X, Receipt } from 'lucide-react';
import Button from '../ui/Button';
import { orderService } from '../../services/orderService';
import { getFranchiseReceiptData } from '../../utils/franchiseUtils';

interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    orderType: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    tableNames?: string[];
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
      notes?: string;
      modifications?: string[];
    }>;
    subtotal?: number;
    gstAmount?: number;
    totalAmount?: number;
    locationId?: string;
  };
}

const ViewOrderModal: React.FC<ViewOrderModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  const [gstSettings, setGstSettings] = useState<{ cgst: number; sgst: number }>({ cgst: 0, sgst: 0 });
  const [franchiseData, setFranchiseData] = useState<any>(null);

  // Fetch GST settings and franchise data when order changes
  useEffect(() => {
    const fetchGstSettings = async () => {
      if (order?.locationId) {
        try {
          const settings = await orderService.getLocationGSTSettings(order.locationId);
          setGstSettings(settings);
        } catch (error) {
          console.error('Error fetching GST settings:', error);
          setGstSettings({ cgst: 0, sgst: 0 });
        }
      }
    };

    const fetchFranchiseData = async () => {
      if (order?.locationId) {
        try {
          const data = await getFranchiseReceiptData(order.locationId);
          setFranchiseData(data);
        } catch (error) {
          console.error('Error fetching franchise data:', error);
          setFranchiseData(null);
        }
      }
    };

    if (isOpen && order) {
      fetchGstSettings();
      fetchFranchiseData();
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Receipt size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
                <p className="text-sm text-gray-600">View order information</p>
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
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Franchise Details */}
            {franchiseData && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Restaurant Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restaurant:</span>
                    <span className="font-medium">{franchiseData.franchiseName}</span>
                  </div>
                  {franchiseData.franchiseAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium text-right max-w-[60%]">{franchiseData.franchiseAddress}</span>
                    </div>
                  )}
                  {franchiseData.franchisePhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{franchiseData.franchisePhone}</span>
                    </div>
                  )}
                  {franchiseData.franchiseLogo && (
                    <div className="flex justify-center mt-3">
                      <img 
                        src={franchiseData.franchiseLogo} 
                        alt="Restaurant Logo" 
                        className="h-12 w-auto object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Header Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'ongoing' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.status === 'ongoing' ? 'Ongoing' : 'Ready'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Type:</span>
                      <span className="font-medium capitalize">
                        {order.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Table Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Table(s):</span>
                      <span className="font-medium">{order.tableNames?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Count:</span>
                      <span className="font-medium">{order.items?.length || 0} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">{formatTime(order.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
              {order.items && order.items.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {order.items?.map((item, index: number) => (
                      <div key={index} className={`p-3 ${index !== order.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-sm text-gray-500">
                                ₹{item.price} each
                              </span>
                              {item.notes && (
                                <span className="text-sm text-blue-600">
                                  Note: {item.notes}
                                </span>
                              )}
                            </div>
                            {item.modifications && item.modifications.length > 0 && (
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">Modifications: </span>
                                <span className="text-xs text-gray-600">
                                  {item.modifications.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No items in this order</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{order.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                {(gstSettings.cgst > 0 || gstSettings.sgst > 0) ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CGST ({gstSettings.cgst}%):</span>
                      <span className="font-medium">₹{((order.subtotal || 0) * gstSettings.cgst / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SGST ({gstSettings.sgst}%):</span>
                      <span className="font-medium">₹{((order.subtotal || 0) * gstSettings.sgst / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total GST ({gstSettings.cgst + gstSettings.sgst}%):</span>
                      <span className="font-medium">₹{order.gstAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (0%):</span>
                    <span className="font-medium">₹0.00</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
                  <span className="text-gray-900">Total Amount:</span>
                  <span className="text-green-600">₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;