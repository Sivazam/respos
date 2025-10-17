import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Clock, 
  Users, 
  DollarSign, 
  Search,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  X,
  Eye,
  RefreshCw
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import { OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import GoForBillModal from '../../components/order/GoForBillModal';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import { OrderService } from '../../services/orderService';
import toast from 'react-hot-toast';

interface PendingOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: OrderItem[];
  totalAmount: number;
  status: 'temporary' | 'ongoing';
  createdAt: Date;
  updatedAt: Date;
  staffId: string;
  sessionStartedAt: Date;
  locationId?: string;
  orderType: 'dinein' | 'delivery'; // Added order type
  orderMode?: 'zomato' | 'swiggy' | 'in-store'; // Added order mode for delivery orders
}

const EnhancedStaffPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    temporaryOrders, 
    loading: ordersLoading, 
    error: ordersError,
    refreshTemporaryOrders 
  } = useTemporaryOrdersDisplay();
  
  const { 
    tables
  } = useTables();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'temporary' | 'ongoing'>('all');
  const [showGoForBill, setShowGoForBill] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PendingOrder | null>(null);

  // Convert temporary orders to pending orders format
  const pendingOrders: PendingOrder[] = temporaryOrders.map(order => {
    const tableNames = order.tableIds?.map(tableId => {
      const table = tables.find(t => t.id === tableId);
      return table?.name || `Table ${tableId}`;
    }) || [];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tableIds: order.tableIds || [],
      tableNames,
      items: order.items || [],
      totalAmount: order.totalAmount || 0,
      status: order.status as 'temporary' | 'ongoing',
      createdAt: order.createdAt || new Date(),
      updatedAt: order.updatedAt || new Date(),
      staffId: order.staffId,
      sessionStartedAt: order.createdAt || new Date(),
      locationId: order.locationId || currentUser?.locationId
    };
  });

  // Filter orders while preserving sort order
  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Ensure most recent orders are on top
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // descending (newest first)
  });

  // Debug output
  console.log('🔍 Enhanced Staff Pending Orders Debug:', {
    temporaryOrdersCount: temporaryOrders.length,
    temporaryOrders: temporaryOrders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      staffId: o.staffId,
      itemsCount: o.items?.length || 0
    })),
    pendingOrdersCount: pendingOrders.length,
    filteredOrdersCount: filteredOrders.length
  });

  // Handle continue order
  const handleContinueOrder = (order: PendingOrder) => {
    console.log('🔧 Editing order:', {
      id: order.id,
      orderNumber: order.orderNumber,
      itemsCount: order.items.length,
      items: order.items.map(item => ({ name: item.name, quantity: item.quantity })),
      orderType: order.orderType,
      orderMode: order.orderMode
    });
    
    // Navigate to POS with order data - using the actual order type and mode
    navigate('/pos', { 
      state: {
        orderType: order.orderType || 'dinein', // Use actual order type, fallback to dinein
        tableIds: order.tableIds,
        isOngoing: true,
        fromLocation: '/staff/pending-orders',
        orderId: order.id // Pass the order ID for loading the correct order
      }
    });
  };

  // Handle go for bill
  const handleGoForBill = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowGoForBill(true);
  };

  // Handle view receipt
  const handleViewReceipt = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowViewOrder(true);
  };

  // Handle delete order
  const handleDeleteOrder = (order: PendingOrder) => {
    setOrderToDelete(order);
    setShowDeleteConfirm(true);
  };

  // Confirm delete order
  const confirmDeleteOrder = async () => {
    if (!orderToDelete || !currentUser) return;

    try {
      console.log('🗑️ Deleting order:', orderToDelete.id, orderToDelete.orderNumber);
      const orderService = OrderService.getInstance();
      
      // Delete the order from database
      await orderService.deleteOrder(orderToDelete.id, currentUser.uid);
      console.log('✅ Order deleted from database and tables released automatically');

      toast.success(`Order ${orderToDelete.orderNumber} cancelled successfully`);
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
      
      // Refresh orders
      await refreshTemporaryOrders();
      console.log('✅ Orders refreshed after delete');
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast.error('Failed to cancel order. Please try again.');
    }
  };

  // Handle close view order
  const handleCloseViewOrder = () => {
    setShowViewOrder(false);
    setSelectedOrder(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'temporary':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Calculate session duration
  const getSessionDuration = (sessionStartedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - sessionStartedAt.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const loading = ordersLoading;

  if (loading) {
    return (
      <DashboardLayout title="Pending Orders">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (ordersError) {
    return (
      <DashboardLayout title="Pending Orders">
        <div className="space-y-4">
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Error loading orders</h3>
                <p className="text-sm text-red-700">{ordersError}</p>
              </div>
            </div>
          </Card>
          <Button onClick={refreshTemporaryOrders} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pending Orders">
      <div className="space-y-6">
        {/* Header Stats - Mobile First */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl lg:text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <Receipt className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-500">Temporary</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-600">
                  {pendingOrders.filter(o => o.status === 'temporary').length}
                </p>
              </div>
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-gray-500" />
            </div>
          </Card>
          
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-500">Ongoing</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">
                  {pendingOrders.filter(o => o.status === 'ongoing').length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">
                  ₹{pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Filters - Mobile First */}
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} className="text-gray-500" />}
            className="w-full"
          />
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                selectedStatus === 'all'
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('temporary')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                selectedStatus === 'temporary'
                  ? 'bg-gray-100 text-gray-800 border border-gray-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Temporary
            </button>
            <button
              onClick={() => setSelectedStatus('ongoing')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                selectedStatus === 'ongoing'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ongoing
            </button>
          </div>
        </div>

        {/* Orders List - Mobile First Grid */}
        {filteredOrders.length === 0 ? (
          <Card className="p-6 lg:p-8 text-center">
            <AlertCircle className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg lg:text-xl font-medium text-gray-900 mb-2">No pending orders</h3>
            <p className="text-sm lg:text-base text-gray-500">
              {searchTerm || selectedStatus !== 'all' 
                ? 'No orders match your filters' 
                : 'No pending orders at the moment'
              }
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                {/* Mobile Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                            {order.status === 'temporary' ? 'Temporary' : 'Ongoing'}
                          </span>
                          <span className="flex items-center text-xs text-gray-600">
                            <Clock size={12} className="mr-1" />
                            {getSessionDuration(order.sessionStartedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl lg:text-2xl font-bold text-green-600">₹{order.totalAmount.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.items.length} items</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-4 lg:p-6">
                  <div className="space-y-3 lg:space-y-4">
                    {/* Table and Time Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users size={14} className="mr-1" />
                        <span>{order.tableNames.join(', ')}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(order.createdAt)}
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="space-y-2">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-500">{item.quantity}x</span>
                            <span className="text-gray-900 font-medium">{item.name}</span>
                          </div>
                          <span className="text-gray-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Mobile First */}
                <div className="px-4 py-3 lg:px-6 lg:py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    {/* Primary Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleContinueOrder(order)}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <Edit size={16} />
                        <span>Edit Order</span>
                      </button>
                      {order.status === 'ongoing' && (
                        <button
                          onClick={() => handleGoForBill(order)}
                          className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
                        >
                          <DollarSign size={16} />
                          <span>Go for Bill</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Secondary Actions */}
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleViewReceipt(order)}
                        className="p-2.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 transform active:scale-95"
                        title="View Receipt"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        className="p-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 transform active:scale-95"
                        title="Cancel Order"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modals */}
        {showGoForBill && selectedOrder && (
          <GoForBillModal
            isOpen={showGoForBill}
            onClose={() => {
              setShowGoForBill(false);
              setSelectedOrder(null);
              // Refresh orders list after modal closes (in case transfer happened)
              setTimeout(() => {
                refreshTemporaryOrders();
              }, 500);
            }}
            order={selectedOrder}
            // Remove onSuccess prop since transfer is handled in the modal
          />
        )}

        {showViewOrder && selectedOrder && (
          <ViewOrderModal
            isOpen={showViewOrder}
            onClose={handleCloseViewOrder}
            order={selectedOrder}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && orderToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
            <div 
            className="rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border-2 border-gray-300 relative modal-solid-white"
            style={{ 
              isolation: 'isolate',
              filter: 'none'
            }}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setOrderToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </Button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-red-500" size={20} />
                  <p className="text-gray-700 font-medium">
                    Are you sure you want to cancel order {orderToDelete.orderNumber}?
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  This will release the associated tables and cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setOrderToDelete(null);
                  }}
                >
                  No, Keep Order
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
                  onClick={confirmDeleteOrder}
                >
                  Yes, Cancel Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnhancedStaffPendingOrdersPage;