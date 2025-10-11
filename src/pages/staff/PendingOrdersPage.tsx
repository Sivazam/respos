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
import { OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import GoForBillModal from '../../components/order/GoForBillModal';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import toast from 'react-hot-toast';

interface PendingOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: OrderItem[];
  totalAmount: number;
  status: 'ongoing' | 'ready';
  createdAt: Date;
  updatedAt: Date;
  staffId: string;
}

const StaffPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, releaseTable } = useTables();
  const { loadFromLocalStorage } = useTemporaryOrder();
  
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ongoing' | 'ready'>('all');
  const [showGoForBill, setShowGoForBill] = useState(false);
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PendingOrder | null>(null);

  // Load pending orders
  useEffect(() => {
    const loadPendingOrders = async () => {
      try {
        setLoading(true);
        
        // Get all occupied tables
        const occupiedTables = tables.filter(table => 
          table.status === 'occupied' && table.currentOrderId
        );

        // For each occupied table, try to load the order
        const orders: PendingOrder[] = [];
        
        // First, check all localStorage keys for temp_order_*
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('temp_order_')) {
            try {
              const orderData = localStorage.getItem(key);
              if (orderData) {
                const order = JSON.parse(orderData);
                
                // Only include orders that are ongoing or ready (not temporary)
                if (order.status === 'ongoing' || order.status === 'ready') {
                  const tableNames = order.tableIds.map((tableId: string) => {
                    const foundTable = tables.find(t => t.id === tableId);
                    return foundTable?.name || `Table ${tableId}`;
                  });

                  orders.push({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    tableIds: order.tableIds,
                    tableNames,
                    items: order.items,
                    totalAmount: order.totalAmount,
                    status: order.status === 'ongoing' ? 'ongoing' : 'ready',
                    createdAt: new Date(order.createdAt),
                    updatedAt: new Date(order.updatedAt),
                    staffId: order.staffId
                  });
                }
              }
            } catch (error) {
              console.error(`Failed to load order from ${key}:`, error);
            }
          }
        }
        
        // Also check occupied tables for any orders that might not be in temp_order_ keys
        for (const table of occupiedTables) {
          try {
            // First try to load from the specific order key
            const specificOrderKey = `temp_order_${table.currentOrderId}`;
            const specificOrderData = localStorage.getItem(specificOrderKey);
            
            let savedOrder = null;
            if (specificOrderData) {
              const order = JSON.parse(specificOrderData);
              savedOrder = {
                ...order,
                createdAt: new Date(order.createdAt),
                sessionStartedAt: new Date(order.sessionStartedAt),
                updatedAt: new Date(order.updatedAt),
              };
            } else {
              // Fallback to main localStorage
              const fallbackOrder = loadFromLocalStorage();
              if (fallbackOrder && 
                  fallbackOrder.tableIds.includes(table.id) && 
                  (fallbackOrder.status === 'ongoing' || fallbackOrder.status === 'temporary') &&
                  fallbackOrder.items.length > 0) {
                savedOrder = fallbackOrder;
              }
            }
            
            if (savedOrder && !orders.find(o => o.id === savedOrder.id)) {
              const tableNames = savedOrder.tableIds.map(tableId => {
                const foundTable = tables.find(t => t.id === tableId);
                return foundTable?.name || `Table ${tableId}`;
              });

              orders.push({
                id: savedOrder.id,
                orderNumber: savedOrder.orderNumber,
                tableIds: savedOrder.tableIds,
                tableNames,
                items: savedOrder.items,
                totalAmount: savedOrder.totalAmount,
                status: savedOrder.status === 'ongoing' ? 'ongoing' : 'ready',
                createdAt: savedOrder.createdAt,
                updatedAt: savedOrder.updatedAt,
                staffId: savedOrder.staffId
              });
            }
          } catch (error) {
            console.error(`Failed to load order for table ${table.id}:`, error);
          }
        }

        setPendingOrders(orders);
        console.log('Loaded pending orders:', orders);
      } catch (error) {
        console.error('Failed to load pending orders:', error);
        toast.error('Failed to load pending orders');
      } finally {
        setLoading(false);
      }
    };

    loadPendingOrders();
  }, [tables, loadFromLocalStorage]);

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
      // Remove from localStorage
      localStorage.removeItem(`temp_order_${orderToDelete.id}`);
      
      // Also try to remove from main localStorage if it exists
      const mainOrderData = localStorage.getItem('restaurant_temporary_order');
      if (mainOrderData) {
        const mainOrder = JSON.parse(mainOrderData);
        if (mainOrder.id === orderToDelete.id) {
          localStorage.removeItem('restaurant_temporary_order');
        }
      }

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

      // Update state to remove the order
      setPendingOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      
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
    toast.success('Bill generated successfully');
    setShowGoForBill(false);
    setSelectedOrder(null);
    // Reload pending orders
    window.location.reload();
  };

  // Handle close view order
  const handleCloseViewOrder = () => {
    setShowViewOrder(false);
    setSelectedOrder(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
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

  if (loading) {
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
                <p className="text-sm text-gray-500">Ready for Bill</p>
                <p className="text-2xl font-bold text-green-600">
                  {pendingOrders.filter(o => o.status === 'ready').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
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
              onClick={() => setSelectedStatus('ready')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'ready'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ready
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
                        {order.status === 'ongoing' ? 'Ongoing' : 'Ready for Bill'}
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
                    
                    <Button
                      onClick={() => handleGoForBill(order)}
                      className="flex items-center gap-2"
                    >
                      <Receipt size={16} />
                      Go for Bill
                    </Button>
                    
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to cancel this order?
              </p>
              <div className="bg-gray-50 rounded p-3">
                <p className="font-medium">{orderToDelete.orderNumber}</p>
                <p className="text-sm text-gray-600">
                  {orderToDelete.tableNames.join(', ')} • {orderToDelete.items.length} items
                </p>
                <p className="text-sm font-medium text-red-600">
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
                className="flex-1"
              >
                No, Keep Order
              </Button>
              <Button
                onClick={confirmDeleteOrder}
                className="flex-1 bg-red-600 hover:bg-red-700"
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