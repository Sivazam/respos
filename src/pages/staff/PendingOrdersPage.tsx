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
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
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
}

const StaffPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, releaseTable } = useTables();
  const { loadFromLocalStorage } = useTemporaryOrder();
  const { temporaryOrders, loading: contextLoading } = useTemporaryOrdersDisplay();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'temporary' | 'ongoing'>('all');
  const [showGoForBill, setShowGoForBill] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);

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
    staffId: order.staffId
  }));

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
    if (!orderToDelete) return;

    try {
      // For now, just release tables and show success
      // The order will be cleaned up automatically when the context refreshes
      
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
                <p className="text-sm text-gray-500">Ongoing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingOrders.filter(o => o.status === 'ongoing').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Temporary</p>
                <p className="text-2xl font-bold text-purple-600">
                  {pendingOrders.filter(o => o.status === 'temporary').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500" />
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
              onClick={() => setSelectedStatus('ongoing')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'ongoing'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setSelectedStatus('temporary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'temporary'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Temporary
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
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status === 'temporary' ? 'Temporary' : 'Ongoing'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
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
                    
                    <div className="text-lg font-semibold text-green-600">
                      ₹{order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {order.status === 'ongoing' && (
                      <Button
                        onClick={() => handleContinueOrder(order)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Edit Order
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleViewReceipt(order)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Eye size={16} />
                      View Order
                    </Button>
                    
                    {order.status === 'ongoing' && (
                      <Button
                        onClick={() => handleGoForBill(order)}
                        className="flex items-center gap-2"
                      >
                        <Receipt size={16} />
                        Go for Bill
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => handleDeleteOrder(order)}
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
    </DashboardLayout>
  );
};

export default StaffPendingOrdersPage;