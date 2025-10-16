import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useTables } from '../../contexts/TableContext';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { OrderService } from '../../services/orderService';
import { OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import GoForBillModal from '../../components/order/GoForBillModal';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import toast from 'react-hot-toast';
import LocalStorageDebug from '../../components/debug/LocalStorageDebug';
import { useOrderStorageCleanup } from '../../hooks/useStorageCleanup';

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
}

const StaffPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, releaseTable } = useTables();
  const { temporaryOrders, loading: contextLoading } = useTemporaryOrdersDisplay();
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'temporary' | 'ongoing'>('all');
  const [showGoForBill, setShowGoForBill] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [orderCreators, setOrderCreators] = useState<{ [key: string]: { email: string; role: string; displayName?: string } }>({});
  const [showLocalStorageDebug, setShowLocalStorageDebug] = useState(false);
  
  // Storage cleanup hook
  const { orderKeyCount, hasDuplicates, cleanupOrderStorage } = useOrderStorageCleanup();

  // Convert temporary orders to pending orders format
  const pendingOrders = temporaryOrders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    tableIds: order.tableIds || [],
    tableNames: order.tableIds?.map(tableId => {
      const foundTable = tables.find(t => t.id === tableId);
      return foundTable?.name || `Table ${tableId}`;
    }) || [],
    items: order.items || [],
    totalAmount: order.totalAmount || 0,
    status: order.status === 'temporary' ? 'temporary' : 'ongoing',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    staffId: order.staffId,
    locationId: order.locationId || currentUser?.locationId
  }));

  // Debug logging
  useEffect(() => {
    console.log('🔍 Staff Pending Orders Debug:');
    console.log('  - Temporary orders from Firestore:', temporaryOrders.length);
    console.log('  - Pending orders (mapped):', pendingOrders.length);
    console.log('  - Order keys in localStorage:', orderKeyCount);
    console.log('  - Has duplicates:', hasDuplicates);
    console.log('  - Temporary orders data:', temporaryOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status })));
  }, [temporaryOrders, pendingOrders, orderKeyCount, hasDuplicates]);

  // Fetch order creator details when orders change
  useEffect(() => {
    const fetchOrderCreators = async () => {
      const creators: { [key: string]: { email: string; role: string; displayName?: string } } = {};
      
      for (const order of pendingOrders) {
        // Fetch creator details if not already cached
        if (order.staffId && !creators[order.staffId]) {
          const creatorDetails = await OrderService.getInstance().getUserDetails(order.staffId);
          if (creatorDetails) {
            creators[order.staffId] = creatorDetails;
          }
        }
      }
      
      setOrderCreators(creators);
    };

    if (pendingOrders.length > 0) {
      fetchOrderCreators();
    }
  }, [pendingOrders]);

  // Filter orders
  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Handle continue order
  const handleContinueOrder = (order: PendingOrder) => {
    navigate('/pos', { 
      state: {
        orderType: 'dinein',
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
      
      // Delete the order from database (this will also release tables automatically)
      await orderService.deleteOrder(orderToDelete.id, currentUser.uid);
      console.log('✅ Order deleted from database and tables released automatically');
      
      toast.success(`Order ${orderToDelete.orderNumber} cancelled successfully`);
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast.error('Failed to cancel order. Please try again.');
    }
  };

  // Handle successful bill
  const handleBillSuccess = () => {
    console.log('🎉 Bill success callback triggered');
    toast.success('Bill generated successfully');
    setShowGoForBill(false);
    setSelectedOrder(null);
    
    // Check localStorage after transfer
    console.log('🔍 Checking localStorage after successful transfer...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_order_') || key.startsWith('manager_pending_'))) {
        console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
      }
    }
    
    // Wait a bit before reloading to see the logs
    console.log('⏳ Waiting 2 seconds before reloading...');
    setTimeout(() => {
      console.log('🔄 Reloading staff pending orders...');
      window.location.reload();
    }, 2000);
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
        return 'bg-purple-100 text-purple-800 border-purple-200';
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

  if (contextLoading) {
    return (
      <DashboardLayout title="Pending Orders">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pending Orders">
      <div className="space-y-6">
        {/* Debug Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {(hasDuplicates || orderKeyCount > 5) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                <AlertCircle size={16} className="text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {hasDuplicates ? 'Duplicate order data detected' : `High storage usage: ${orderKeyCount} order keys`}
                </span>
                <Button
                  onClick={() => {
                    const removedKeys = cleanupOrderStorage();
                    toast.success(`Cleared ${removedKeys.length} storage keys`);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-yellow-700 border-yellow-400 hover:bg-yellow-50"
                >
                  Cleanup
                </Button>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => setShowLocalStorageDebug(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-purple-600 border-purple-300"
          >
            <Eye size={16} />
            Debug Local Storage
          </Button>
        </div>
        
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
                <p className="text-xs lg:text-sm text-gray-500">Ongoing</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">
                  {pendingOrders.filter(o => o.status === 'ongoing').length}
                </p>
              </div>
              <Clock className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm text-gray-500">Temporary</p>
                <p className="text-xl lg:text-2xl font-bold text-purple-600">
                  {pendingOrders.filter(o => o.status === 'temporary').length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 lg:w-8 lg:h-8 text-purple-500" />
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
              onClick={() => setSelectedStatus('ongoing')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                selectedStatus === 'ongoing'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setSelectedStatus('temporary')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                selectedStatus === 'temporary'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Temporary
            </button>
          </div>
        </div>

        {/* Orders List - Mobile First Grid */}
        {filteredOrders.length === 0 ? (
          <Card className="p-6 lg:p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400" />
              <div>
                <h3 className="text-lg lg:text-xl font-medium text-gray-900 mb-2">No pending orders</h3>
                <p className="text-sm lg:text-base text-gray-500">
                  {searchTerm || selectedStatus !== 'all' 
                    ? 'No orders match your filters' 
                    : 'No pending orders at the moment'
                  }
                </p>
              </div>
            </div>
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
                          {order.tableNames.length > 0 && (
                            <span className="flex items-center text-xs text-gray-600">
                              <Users size={12} className="mr-1" />
                              {order.tableNames.join(', ')}
                            </span>
                          )}
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
                    {/* Time and Staff Info */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <Clock size={14} className="mr-1" />
                        <span>{formatTime(order.createdAt)}</span>
                      </div>
                      {orderCreators[order.staffId] && (
                        <div className="text-xs text-gray-500">
                          by {orderCreators[order.staffId].displayName || orderCreators[order.staffId].email.split('@')[0]}
                        </div>
                      )}
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
                        <span>Continue Order</span>
                      </button>
                      <button
                        onClick={() => handleGoForBill(order)}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
                      >
                        <DollarSign size={16} />
                        <span>Go for Bill</span>
                      </button>
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
      </DashboardLayout>

      {/* View Order Modal */}
      {selectedOrder && (
        <ViewOrderModal
          isOpen={showViewOrder}
          onClose={handleCloseViewOrder}
          order={selectedOrder}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && orderToDelete && (

      {/* Go for Bill Modal */}
      {selectedOrder && (
        <GoForBillModal
          isOpen={showGoForBill}
          onClose={() => {
            setShowGoForBill(false);
            setSelectedOrder(null);
          }}
          onSuccess={handleBillSuccess}
          order={selectedOrder}
        />
      )}

      {/* View Order Modal */}
      {selectedOrder && (
        <ViewOrderModal
          isOpen={showViewOrder}
          onClose={handleCloseViewOrder}
          order={selectedOrder}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && orderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-gray-700 font-medium">
                  Are you sure you want to cancel this order?
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="font-semibold text-gray-900 mb-1">{orderToDelete.orderNumber}</p>
                <p className="text-sm text-gray-600 mb-2">
                  {orderToDelete.tableNames.join(', ')} • {orderToDelete.items.length} items
                </p>
                <p className="text-lg font-bold text-red-600">
                  ₹{orderToDelete.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                No, Keep Order
              </Button>
              <Button
                onClick={confirmDeleteOrder}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Local Storage Debug Modal */}
      {showLocalStorageDebug && (
        <LocalStorageDebug
          onClose={() => setShowLocalStorageDebug(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default StaffPendingOrdersPage;