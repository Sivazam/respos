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
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import { OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import GoForBillModal from '../../components/order/GoForBillModal';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import toast from 'react-hot-toast';
import { OrderService } from '../../services/orderService';

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
    tables,
    releaseTable
  } = useTables();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'temporary' | 'ongoing'>('all');
  const [showGoForBill, setShowGoForBill] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PendingOrder | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

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
      sessionStartedAt: order.createdAt || new Date()
    };
  });

  // Filter orders
  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
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
      items: order.items.map(item => ({ name: item.name, quantity: item.quantity }))
    });
    
    // Navigate to POS with order data - using the same approach as the original implementation
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

  // Handle transfer to manager
  const handleTransferToManager = async (order: PendingOrder, notes?: string) => {
    setIsTransferring(true);
    try {
      const orderService = OrderService.getInstance();
      await orderService.transferOrderToManager(order.id, order.staffId, notes);
      toast.success(`Order ${order.orderNumber} transferred to manager successfully`);
      setShowGoForBill(false);
      setSelectedOrder(null);
      
      // Refresh orders list
      setTimeout(() => {
        refreshTemporaryOrders();
      }, 1000);
    } catch (error: any) {
      console.error('Error transferring order:', error);
      toast.error(error.message || 'Failed to transfer order to manager');
    } finally {
      setIsTransferring(false);
    }
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
      console.log('✅ Order deleted from database');
      
      // Release tables if it's a dine-in order
      if (orderToDelete.tableIds && orderToDelete.tableIds.length > 0) {
        for (const tableId of orderToDelete.tableIds) {
          try {
            await releaseTable(tableId);
            console.log(`Successfully released table ${tableId} for deleted order ${orderToDelete.id}`);
          } catch (error) {
            console.error(`Failed to release table ${tableId}:`, error);
          }
        }
      }

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
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Temporary</p>
                <p className="text-2xl font-bold text-gray-600">
                  {pendingOrders.filter(o => o.status === 'temporary').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ongoing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingOrders.filter(o => o.status === 'ongoing').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} className="text-gray-500" />}
            className="flex-1"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('temporary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'temporary'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Temporary
            </button>
            <button
              onClick={() => setSelectedStatus('ongoing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'ongoing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ongoing
            </button>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending orders</h3>
            <p className="text-gray-500">
              {searchTerm || selectedStatus !== 'all' 
                ? 'No orders match your filters' 
                : 'No pending orders at the moment'
              }
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status === 'temporary' ? 'Temporary' : 'Ongoing'}
                      </span>
                      <span className="text-sm text-gray-500">
                        Session: {getSessionDuration(order.sessionStartedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{order.tableNames.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{formatTime(order.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Receipt size={16} />
                        <span>{order.items.length} items</span>
                      </div>
                    </div>
                    
                    <div className="text-lg font-semibold text-gray-900">
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt(order)}
                    >
                      <Eye size={16} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleContinueOrder(order)}
                    >
                      <Edit size={16} />
                    </Button>
                    
                    {order.status === 'ongoing' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleGoForBill(order)}
                        disabled={isTransferring}
                      >
                        {isTransferring ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          'Go for Bill'
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteOrder(order)}
                    >
                      <Trash2 size={16} />
                    </Button>
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
            }}
            order={selectedOrder}
            onSuccess={(notes) => handleTransferToManager(selectedOrder, notes)}
            isProcessing={isTransferring}
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