import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  Clock, 
  Users, 
  DollarSign, 
  ArrowRight,
  Search,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  X,
  Tag,
  Percent
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import ManagerSettleModal from '../../components/manager/ManagerSettleModal';
import EnhancedCouponSelectionModal from '../../components/order/EnhancedCouponSelectionModal';
import { couponService, OrderCoupons } from '../../services/couponService';
import toast from 'react-hot-toast';

interface PendingOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: any[];
  totalAmount: number;
  status: 'transferred' | 'ongoing';
  createdAt: Date;
  updatedAt: Date;
  staffId: string;
  transferredAt?: Date;
  transferredBy?: string;
  orderType: 'dinein' | 'delivery';
  customer?: {
    name?: string;
    phone?: string;
    city?: string;
    collectedBy?: 'staff' | 'manager';
    collectedAt?: number;
  };
  // Add coupon support
  appliedCoupons?: OrderCoupons;
  originalTotalAmount?: number; // Store original amount before coupons
}

const ManagerPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { tables, releaseTable } = useTables();
  const { currentUser } = useAuth();
  
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'transferred' | 'ongoing'>('all');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<PendingOrder | null>(null);
  
  // Coupon-related state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [orderForCoupons, setOrderForCoupons] = useState<PendingOrder | null>(null);
  

  // Load transferred orders from localStorage
  const loadPendingOrders = useCallback(async () => {
      try {
        setLoading(true);
        
        console.log('🔍 Loading manager pending orders...');
        const orders: PendingOrder[] = [];
        
        // Load all manager pending orders from localStorage
        console.log('📦 Checking localStorage for manager_pending_ keys...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('manager_pending_')) {
            try {
              console.log(`📋 Found manager order key: ${key}`);
              const orderData = JSON.parse(localStorage.getItem(key) || '{}');
              console.log(`📄 Order data for ${key}:`, orderData);
              
              const tableNames = orderData.tableIds.map((tableId: string) => {
                const foundTable = tables.find(t => t.id === tableId);
                return foundTable?.name || `Table ${tableId}`;
              });

              const order = {
                id: orderData.id,
                orderNumber: orderData.orderNumber,
                tableIds: orderData.tableIds,
                tableNames,
                items: orderData.items,
                totalAmount: orderData.totalAmount,
                status: orderData.status,
                createdAt: new Date(orderData.createdAt),
                updatedAt: new Date(orderData.updatedAt),
                staffId: orderData.staffId,
                // Include coupon information if available
                appliedCoupons: orderData.appliedCoupons,
                originalTotalAmount: orderData.originalTotalAmount
              };

              orders.push(order);
              console.log(`✅ Added order ${order.orderNumber} to manager pending list`);
            } catch (error) {
              console.error(`❌ Failed to load order from ${key}:`, error);
            }
          }
        }

        setPendingOrders(orders);
        console.log('📊 Total manager orders found:', orders.length);
        console.log('📋 Manager pending orders:', orders);
      } catch (error) {
        console.error('Failed to load pending orders:', error);
        toast.error('Failed to load pending orders');
      } finally {
        setLoading(false);
      }
    }, [tables]);

  // Manual refresh function
  const refreshOrders = () => {
    console.log('🔄 Manual refresh triggered');
    loadPendingOrders();
  };

  // Load pending orders on component mount and when tables change
  useEffect(() => {
    loadPendingOrders();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('⏰ Periodic refresh triggered');
      loadPendingOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadPendingOrders]);

  // Filter orders
  const filteredOrders = pendingOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Handle continue order (only for manager-created ongoing orders)
  const handleContinueOrder = (order: PendingOrder) => {
    navigate('/pos', { 
      state: {
        orderType: order.orderType,
        tableIds: order.tableIds,
        isOngoing: true,
        fromLocation: '/manager/pending-orders',
        orderId: order.id // Pass the order ID for loading the correct order
      }
    });
  };

  // Handle view receipt
  const handleViewReceipt = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };

  // Handle settle order with customer info
  const handleSettleOrderWithCustomer = (order: PendingOrder) => {
    setSelectedOrder(order);
    setShowSettleModal(true);
  };

  // Handle settle from modal
  const handleSettleFromModal = async (order: any, paymentMethod: string, customerInfo?: any) => {
    await handleSettleOrder(order, paymentMethod);
    setShowSettleModal(false);
    setSelectedOrder(null);
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
      if (orderToDelete.status === 'transferred') {
        localStorage.removeItem(`manager_pending_${orderToDelete.id}`);
      } else {
        localStorage.removeItem(`temp_order_${orderToDelete.id}`);
      }
      
      // Also try to remove from main localStorage if it exists
      const mainOrderData = localStorage.getItem('restaurant_temporary_order');
      if (mainOrderData) {
        const mainOrder = JSON.parse(mainOrderData);
        if (mainOrder.id === orderToDelete.id) {
          localStorage.removeItem('restaurant_temporary_order');
        }
      }

      // Release tables if it's a dine-in order
      for (const tableId of orderToDelete.tableIds) {
        try {
          await releaseTable(tableId);
          console.log(`Successfully released table ${tableId} for deleted order ${orderToDelete.id}`);
        } catch (error) {
          console.error(`Failed to release table ${tableId}:`, error);
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

  // Handle settle order
  const handleSettleOrder = async (order: PendingOrder, paymentMethod: string) => {
    try {
      console.log('Settling order:', order);
      
      // Create final order record
      const finalOrder = {
        ...order,
        status: 'settled',
        paymentMethod,
        settledAt: new Date(),
        settledBy: currentUser?.uid,
        updatedAt: new Date()
      };

      // Save to completed orders (in real implementation, this would be saved to database)
      const completedOrdersKey = `completed_orders_${currentUser?.uid}`;
      const existingOrders = JSON.parse(localStorage.getItem(completedOrdersKey) || '[]');
      existingOrders.push(finalOrder);
      localStorage.setItem(completedOrdersKey, JSON.stringify(existingOrders));

      // Remove from pending orders
      if (order.status === 'transferred') {
        localStorage.removeItem(`manager_pending_${order.id}`);
      } else {
        // For ongoing orders, clear the temporary order and release tables
        localStorage.removeItem(`temp_order_${order.id}`);
      }

      // Release tables - this is the key fix!
      console.log('Releasing tables:', order.tableIds);
      for (const tableId of order.tableIds) {
        try {
          await releaseTable(tableId);
          console.log(`Successfully released table ${tableId}`);
        } catch (error) {
          console.error(`Failed to release table ${tableId}:`, error);
        }
      }

      toast.success('Order settled successfully and tables released');
      setShowReceiptModal(false);
      setSelectedOrder(null);
      
      // Reload pending orders
      window.location.reload();
    } catch (error) {
      console.error('Error settling order:', error);
      toast.error('Failed to settle order');
    }
  };

  // Handle apply coupons to order
  const handleApplyCoupons = (order: PendingOrder) => {
    setOrderForCoupons(order);
    setShowCouponModal(true);
  };

  // Handle coupon application from modal
  const handleCouponApplication = async (orderCoupons: OrderCoupons, totalDiscount: number) => {
    if (!orderForCoupons) return;

    try {
      // Calculate original subtotal
      const originalSubtotal = orderForCoupons.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Update order with applied coupons
      const updatedOrder = {
        ...orderForCoupons,
        appliedCoupons: orderCoupons,
        originalTotalAmount: originalSubtotal,
        totalAmount: originalSubtotal - totalDiscount,
        updatedAt: new Date()
      };

      // Update in localStorage
      const storageKey = orderForCoupons.status === 'transferred' ? 
        `manager_pending_${orderForCoupons.id}` : 
        `temp_order_${orderForCoupons.id}`;
      
      localStorage.setItem(storageKey, JSON.stringify(updatedOrder));

      // Update state
      setPendingOrders(prev => 
        prev.map(order => 
          order.id === orderForCoupons.id ? updatedOrder : order
        )
      );

      toast.success(`Coupons applied successfully! Saved ₹${totalDiscount.toFixed(2)}`);
      setShowCouponModal(false);
      setOrderForCoupons(null);
    } catch (error) {
      console.error('Error applying coupons:', error);
      toast.error('Failed to apply coupons');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'transferred':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'Ongoing';
      case 'transferred':
        return 'Transferred from Staff';
      default:
        return status;
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
                <p className="text-sm text-gray-500">Transferred</p>
                <p className="text-2xl font-bold text-orange-600">
                  {pendingOrders.filter(o => o.status === 'transferred').length}
                </p>
              </div>
              <ArrowRight className="w-8 h-8 text-orange-500" />
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
              onClick={refreshOrders}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-100 text-green-800 hover:bg-green-200 flex items-center gap-2"
              title="Refresh orders"
            >
              <span>🔄</span>
              Refresh
            </button>
            
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
              onClick={() => setSelectedStatus('transferred')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'transferred'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Transferred
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
                        {getStatusText(order.status)}
                      </span>
                      {order.orderType === 'delivery' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border-purple-200">
                          Delivery
                        </span>
                      )}
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
                      {order.transferredAt && (
                        <div className="flex items-center gap-1">
                          <ArrowRight size={16} />
                          <span>Transferred at {formatTime(order.transferredAt)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Coupon Information */}
                    {order.appliedCoupons && (
                      <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Tag size={14} className="text-orange-600" />
                          <span className="font-medium text-orange-800">Coupons Applied:</span>
                          <span className="text-orange-600">
                            ₹{(
                              (order.originalTotalAmount || order.totalAmount) - order.totalAmount
                            ).toFixed(2)} saved
                          </span>
                        </div>
                        <div className="text-xs text-orange-700 mt-1">
                          {order.appliedCoupons.regularCoupon && (
                            <div>• {order.appliedCoupons.regularCoupon.name}: -₹{order.appliedCoupons.regularCoupon.discountAmount.toFixed(2)}</div>
                          )}
                          {order.appliedCoupons.dishCoupons.map((dishCoupon, index) => (
                            <div key={index}>• {dishCoupon.dishName}: -₹{dishCoupon.discountAmount.toFixed(2)}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Price Display */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {order.appliedCoupons && order.originalTotalAmount ? (
                          <>
                            <div className="text-sm text-gray-500 line-through">
                              Original: ₹{order.originalTotalAmount.toFixed(2)}
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              After coupons: ₹{order.totalAmount.toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <div className="text-lg font-semibold text-green-600">
                            ₹{order.totalAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(order.status === 'ongoing' || order.status === 'transferred') && (
                      <Button
                        onClick={() => handleContinueOrder(order)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Edit Order
                      </Button>
                    )}
                    
                    {/* Coupon Management Button */}
                    <Button
                      onClick={() => handleApplyCoupons(order)}
                      variant="outline"
                      className="flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      <Tag size={16} />
                      {order.appliedCoupons ? 'Edit Coupons' : 'Apply Coupons'}
                    </Button>
                    
                    <Button
                      onClick={() => handleViewReceipt(order)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Eye size={16} />
                      View Order
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

      {/* Receipt Modal */}
      {selectedOrder && (
        <FinalReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedOrder(null);
          }}
          order={{
            ...selectedOrder,
            subtotal: selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            totalAmount: selectedOrder.totalAmount,
            total: selectedOrder.totalAmount,
            paymentData: {
              paymentMethod: 'cash',
              settledAt: new Date()
            },
            locationId: currentUser?.locationId
          }}
          paymentMethod="cash"
          isReadOnly={true}
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

      {/* Coupon Selection Modal */}
      {showCouponModal && orderForCoupons && (
        <EnhancedCouponSelectionModal
          isOpen={showCouponModal}
          onClose={() => {
            setShowCouponModal(false);
            setOrderForCoupons(null);
          }}
          onApplyCoupons={handleCouponApplication}
          orderSubtotal={orderForCoupons.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
          orderItems={orderForCoupons.items}
          existingCoupons={orderForCoupons.appliedCoupons}
        />
      )}
    </DashboardLayout>
  );
};

export default ManagerPendingOrdersPage;