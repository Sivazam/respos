import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Eye, MapPin, Calendar, User, DollarSign } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useEnhancedOrders } from '../../contexts/EnhancedOrderContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { Order } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';

const EnhancedAdminOrdersPage: React.FC = () => {
  const { allOrders, loading, error, getOrderById } = useEnhancedOrders();
  const { currentUser } = useAuth();
  const { locations } = useLocations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

  // Filter completed orders only
  const completedOrders = allOrders.filter(order => order.status === 'completed');

  // Get location name by ID
  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.storeName || location?.name || `Location ${locationId}`;
  };

  // Filter orders based on search and location
  const filteredOrders = completedOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesLocation = selectedLocation === 'all' || order.locationId === selectedLocation;
    
    return matchesSearch && matchesLocation;
  });

  // Handle view receipt
  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod(order.paymentData?.paymentMethod || 'cash');
    setShowReceipt(true);
  };

  // Handle close receipt
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setSelectedOrder(null);
  };

  // Format date
  const formatDate = (date: any) => {
    try {
      let dateObj: Date;
      
      if (date?.toDate) {
        dateObj = date.toDate();
      } else if (date?.seconds) {
        dateObj = new Date(date.seconds * 1000);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        dateObj = new Date();
      }
      
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get payment method color
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'card':
        return 'bg-blue-100 text-blue-800';
      case 'upi':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Orders Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-2 text-gray-600">Loading orders...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders Management">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          
          <div className="lg:w-64">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.storeName || location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 flex items-center">
            Total Orders: {filteredOrders.length}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p>{searchTerm || selectedLocation !== 'all' ? 'Try adjusting your filters' : 'No completed orders yet'}</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <Card key={order.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.orderNumber}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(order.paymentData?.paymentMethod || 'cash')}`}>
                        {order.paymentData?.paymentMethod?.toUpperCase() || 'CASH'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(order.completedAt || order.updatedAt)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        {getLocationName(order.locationId)}
                      </div>
                      
                      {order.customerName && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          {order.customerName}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} />
                        ₹{order.totalAmount?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    
                    {/* Items Preview */}
                    <div className="text-sm text-gray-600">
                      <div className="max-w-lg">
                        {order.items?.slice(0, 3).map((item: any, index: number) => (
                          <span key={index}>
                            {item.quantity}x {item.name}
                            {index < Math.min(order.items.length - 1, 2) && ', '}
                          </span>
                        ))}
                        {order.items?.length > 3 && (
                          <span className="text-gray-500"> +{order.items.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(order)}
                      className="inline-flex items-center"
                    >
                      <Eye size={16} className="mr-1" />
                      View Receipt
                    </Button>
                  </div>
                </div>

                {/* GST Breakdown */}
                {order.subtotal !== undefined && order.gstAmount !== undefined && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal: ₹{order.subtotal.toFixed(2)}</span>
                      <span>GST: ₹{order.gstAmount.toFixed(2)}</span>
                      <span className="font-medium text-gray-900">Total: ₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Receipt Modal */}
        {showReceipt && selectedOrder && (
          <FinalReceiptModal
            isOpen={showReceipt}
            onClose={handleCloseReceipt}
            order={selectedOrder}
            paymentMethod={selectedPaymentMethod}
            onPaymentComplete={() => {}} // Already completed
            isReadOnly={true}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnhancedAdminOrdersPage;