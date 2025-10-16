import React, { useState } from 'react';
// Cache bust: 2025-01-12-04-30 - Firestore Timestamp fix
import { 
  Receipt, 
  Clock, 
  Users, 
  DollarSign, 
  Search,
  AlertCircle,
  Eye,
  RefreshCw,
  CreditCard,
  UserCheck,
  Calendar,
  MessageSquare,
  Edit3,
  Trash2,
  Printer
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useEnhancedOrders } from '../../contexts/EnhancedOrderContext';
import { useRealtimeTables } from '../../contexts/RealtimeTableContext';
import { useAuth } from '../../contexts/AuthContext';
import { OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import EditOrderModal from '../../components/order/EditOrderModal';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import CustomerInfoAndPaymentModal from '../../components/CustomerInfoAndPaymentModal';
import toast from 'react-hot-toast';
import { useMenuItems } from '../../contexts/MenuItemContext';

interface ManagerPendingOrder {
  id: string;
  orderId: string;
  locationId?: string;
  locationName?: string;
  order: {
    id: string;
    orderNumber: string;
    tableIds: string[];
    tableNames: string[];
    items: OrderItem[];
    totalAmount: number;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    createdAt: Date | string | any;
    transferredAt: Date | string | any;
    staffId: string;
  };
  transferredBy: string;
  transferredAt: Date | string | any;
  status: 'pending' | 'assigned' | 'in_progress' | 'ready_for_settlement';
  priority: 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  transferNotes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: Date | string | any;
}

const EnhancedManagerPendingOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    managerPendingOrders, 
    loading: ordersLoading, 
    error: ordersError,
    acceptPendingOrder,
    settleOrder,
    refreshOrders,
    updateOrder,
    deleteOrder
  } = useEnhancedOrders();
  
  // Debug logging for manager pending orders
  React.useEffect(() => {
    console.log('🎯 EnhancedPendingOrdersPage received managerPendingOrders:', managerPendingOrders.length, managerPendingOrders);
  }, [managerPendingOrders]);
  
  const { 
    loading: tablesLoading,
    getTableById 
  } = useRealtimeTables();
  
  const { menuItems } = useMenuItems();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'assigned' | 'in_progress'>('all');
  const [showViewOrder, setShowViewOrder] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [showFinalReceipt, setShowFinalReceipt] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ManagerPendingOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<'settle' | 'print' | null>(null);

  // Convert manager pending orders to display format
  const displayOrders: ManagerPendingOrder[] = managerPendingOrders.map(pendingOrder => {
    try {
      const tableNames = pendingOrder.order?.tableIds?.map(tableId => {
        const table = getTableById(tableId);
        return table?.name || `Table ${tableId}`;
      }) || [];

      // Helper function to convert any date type to Date object
      const convertToDate = (dateInput: any): Date => {
        if (!dateInput) return new Date();
        
        // Handle Firestore Timestamp objects
        if (typeof dateInput === 'object' && dateInput.seconds && dateInput.nanoseconds) {
          return new Date(dateInput.seconds * 1000 + dateInput.nanoseconds / 1000000);
        }
        // Handle objects with toDate() method (Firestore Timestamps)
        else if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
          return dateInput.toDate();
        }
        // Handle string dates
        else if (typeof dateInput === 'string') {
          return new Date(dateInput);
        }
        // Handle Date objects
        else if (dateInput instanceof Date) {
          return dateInput;
        }
        // Fallback
        else {
          return new Date(dateInput);
        }
      };

      const transferredAtValue = convertToDate(pendingOrder.transferredAt || pendingOrder.order?.transferredAt);
      const createdAtValue = convertToDate(pendingOrder.order?.createdAt);
      const orderTransferredAtValue = convertToDate(pendingOrder.order?.transferredAt);

      return {
        id: pendingOrder.id || '',
        orderId: pendingOrder.orderId || pendingOrder.order?.id || '',
        locationId: pendingOrder.locationId,
        locationName: pendingOrder.locationName || 'Unknown Location',
        order: {
          ...pendingOrder.order,
          tableNames,
          createdAt: createdAtValue,
          transferredAt: orderTransferredAtValue
        },
        transferredBy: pendingOrder.transferredBy || 'Unknown',
        transferredAt: transferredAtValue,
        status: pendingOrder.status || 'pending',
        priority: pendingOrder.priority || 'normal',
        assignedTo: pendingOrder.assignedTo,
        transferNotes: pendingOrder.transferNotes,
        createdBy: pendingOrder.createdBy,
        createdByName: pendingOrder.createdByName || 'Unknown',
        createdAt: pendingOrder.createdAt ? convertToDate(pendingOrder.createdAt) : createdAtValue
      };
    } catch (error) {
      console.error('Error processing pending order:', error, pendingOrder);
      // Return a default order structure to prevent crashes
      return {
        id: pendingOrder.id || 'unknown',
        orderId: pendingOrder.orderId || 'unknown',
        order: {
          id: 'unknown',
          orderNumber: 'Unknown',
          tableIds: [],
          tableNames: [],
          items: [],
          totalAmount: 0,
          createdAt: new Date(),
          transferredAt: new Date(),
          staffId: ''
        },
        transferredBy: 'Unknown',
        transferredAt: new Date(),
        status: 'pending',
        priority: 'normal',
        assignedTo: undefined,
        transferNotes: undefined
      };
    }
  });

  // Filter orders
  const filteredOrders = displayOrders.filter(order => {
    try {
      const matchesSearch = 
        order.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order?.tableNames?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.order?.customerName && order.order.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    } catch (error) {
      console.error('Error filtering order:', error, order);
      return false; // Exclude problematic orders from display
    }
  });

  // Handle accept order
  const handleAcceptOrder = async (pendingOrder: ManagerPendingOrder) => {
    setIsProcessing(true);
    try {
      await acceptPendingOrder(pendingOrder.id);
      toast.success(`Order ${pendingOrder.order.orderNumber} accepted successfully`);
      refreshOrders();
    } catch (error: any) {
      console.error('Error accepting order:', error);
      toast.error(error.message || 'Failed to accept order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle settle bill
  const handleSettleBill = async (order: ManagerPendingOrder) => {
    setSelectedOrder(order);
    setPendingAction('settle');
    
    // Always show unified modal for both staff and manager orders
    setShowUnifiedModal(true);
  };

  // Handle view order
  const handleViewOrder = (order: ManagerPendingOrder) => {
    setSelectedOrder(order);
    setShowViewOrder(true);
  };

  // Handle close view order
  const handleCloseViewOrder = () => {
    setShowViewOrder(false);
    setSelectedOrder(null);
  };

  // Handle close edit order
  const handleCloseEditOrder = () => {
    setShowEditOrder(false);
    setSelectedOrder(null);
  };

  // Handle edit order
  const handleEditOrder = (order: ManagerPendingOrder) => {
    setSelectedOrder(order);
    setShowEditOrder(true);
  };

  // Handle delete order
  const handleDeleteOrder = async (order: ManagerPendingOrder) => {
    if (!window.confirm(`Are you sure you want to delete order ${order.order.orderNumber}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await deleteOrder(order.orderId);
      toast.success(`Order ${order.order.orderNumber} deleted successfully`);
      refreshOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error(error.message || 'Failed to delete order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle view/print receipt
  const handleViewPrintReceipt = async (order: ManagerPendingOrder) => {
    setSelectedOrder(order);
    setPendingAction('print');
    
    // Always show unified modal for both staff and manager orders
    setShowUnifiedModal(true);
  };

  // Handle unified modal confirmation
  const handleUnifiedModalConfirm = async (customerData: { name?: string; phone?: string; city?: string }, paymentMethod: string) => {
    if (!selectedOrder) return;
    
    setIsProcessing(true);
    
    try {
      // Save customer data to Firestore if provided
      if (customerData.name || customerData.phone || customerData.city) {
        const { upsertCustomerData } = await import('../../contexts/CustomerDataService');
        await upsertCustomerData(
          selectedOrder.orderId, 
          customerData, 
          'manager', 
          Date.now(),
          currentUser?.uid || 'unknown',
          selectedOrder.locationId || 'unknown'
        );
        console.log('✅ Customer data saved by manager');
      }
      
      setShowUnifiedModal(false);
      setSelectedPaymentMethod(paymentMethod);
      
      // Determine which flow to continue based on what triggered the unified modal
      if (pendingAction === 'settle') {
        // Go directly to settlement
        const paymentData = {
          paymentMethod: paymentMethod,
          amount: selectedOrder.order.totalAmount,
          settledAt: new Date(),
          status: 'completed'
        };
        
        await settleOrder(selectedOrder.orderId, paymentData);
        toast.success(`Order ${selectedOrder.order.orderNumber} settled successfully`);
        
        // Refresh orders
        setTimeout(() => {
          refreshOrders();
        }, 1000);
      } else if (pendingAction === 'print') {
        // Show final receipt for printing
        setShowFinalReceipt(true);
      }
      
      // Clear pending action
      setPendingAction(null);
      
    } catch (error: any) {
      console.error('Error processing unified modal:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle save edited order
  const handleSaveEditedOrder = async (updatedOrder: any) => {
    if (!selectedOrder) return;

    setIsProcessing(true);
    try {
      await updateOrder(selectedOrder.orderId, updatedOrder);
      toast.success(`Order ${selectedOrder.order.orderNumber} updated successfully`);
      setShowEditOrder(false);
      setSelectedOrder(null);
      refreshOrders();
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle settle order (mark as settled/completed)
  const handleSettleOrder = async (order: ManagerPendingOrder) => {
    if (!window.confirm(`Are you sure you want to settle order ${order.order.orderNumber}? This will mark it as completed and move it to the orders list.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const paymentData = {
        paymentMethod: 'cash', // Default payment method for settling
        amount: order.order.totalAmount,
        settledAt: new Date(),
        status: 'completed'
      };

      await settleOrder(order.orderId, paymentData);
      toast.success(`Order ${order.order.orderNumber} settled successfully`);
      
      // Immediate refresh
      refreshOrders();
      
      // Additional refresh after a short delay to ensure UI updates
      setTimeout(() => {
        refreshOrders();
      }, 500);
    } catch (error: any) {
      console.error('Error settling order:', error);
      toast.error(error.message || 'Failed to settle order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle settle order (save to all dashboards)
  const handleSettleOrderFromReceipt = async () => {
    if (!selectedOrder) return;

    setIsProcessing(true);
    try {
      // This would typically update the order status and make it visible to all dashboards
      // For now, we'll use the existing settleOrder function
      const paymentData = {
        paymentMethod: selectedPaymentMethod,
        amount: selectedOrder.order.totalAmount,
        settledAt: new Date(),
        isSettled: true
      };

      await settleOrder(selectedOrder.orderId, paymentData);
      toast.success(`Order ${selectedOrder.order.orderNumber} settled and saved to all dashboards`);
      setShowFinalReceipt(false);
      setSelectedOrder(null);
      
      // Immediate refresh
      refreshOrders();
      
      // Additional refresh after a short delay to ensure UI updates
      setTimeout(() => {
        refreshOrders();
      }, 500);
    } catch (error: any) {
      console.error('Error settling order:', error);
      toast.error(error.message || 'Failed to settle order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle complete payment with receipt
  const handleCompletePaymentWithReceipt = async () => {
    if (!selectedOrder) return;

    setIsProcessing(true);
    try {
      const paymentData = {
        paymentMethod: selectedPaymentMethod,
        amount: selectedOrder.order.totalAmount,
        settledAt: new Date()
      };

      await settleOrder(selectedOrder.orderId, paymentData);
      toast.success(`Order ${selectedOrder.order.orderNumber} payment completed successfully`);
      setShowFinalReceipt(false);
      setSelectedOrder(null);
      
      // Refresh orders
      setTimeout(() => {
        refreshOrders();
      }, 1000);
    } catch (error: any) {
      console.error('Error completing payment:', error);
      toast.error(error.message || 'Failed to complete payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle close edit modal
  const handleCloseEditOrder = () => {
    setShowEditOrder(false);
    setSelectedOrder(null);
  };

  // Handle close final receipt modal
  const handleCloseFinalReceipt = () => {
    setShowFinalReceipt(false);
    setSelectedOrder(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready_for_settlement':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format time
  const formatTime = (date: Date | string | any) => {
    try {
      let dateObj: Date;
      
      // Handle Firestore Timestamp objects
      if (typeof date === 'object' && date.seconds && date.nanoseconds) {
        dateObj = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
      }
      // Handle objects with toDate() method (Firestore Timestamps)
      else if (typeof date === 'object' && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      }
      // Handle string dates
      else if (typeof date === 'string') {
        // Handle different date string formats
        if (date.includes('T')) {
          // ISO format
          dateObj = new Date(date);
        } else if (date.includes(' ')) {
          // Format like "2024-01-01 12:00:00"
          dateObj = new Date(date.replace(' ', 'T'));
        } else {
          // Try direct conversion
          dateObj = new Date(date);
        }
      }
      // Handle Date objects
      else if (date instanceof Date) {
        dateObj = date;
      }
      else {
        dateObj = new Date(date);
      }
      
      // Check if the date is valid
      if (!dateObj || isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      
      return dateObj.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('Error in formatTime:', error, 'date:', date);
      return 'Invalid Date';
    }
  };

  // Calculate waiting time
  const getWaitingTime = (transferredAt: Date | string | any) => {
    try {
      const now = new Date();
      
      // Handle null/undefined
      if (!transferredAt) {
        return 'Unknown';
      }
      
      let transferredDate: Date;
      
      // Handle Firestore Timestamp objects
      if (typeof transferredAt === 'object' && transferredAt.seconds && transferredAt.nanoseconds) {
        transferredDate = new Date(transferredAt.seconds * 1000 + transferredAt.nanoseconds / 1000000);
      }
      // If it's already a valid Date object, use it directly
      else if (transferredAt instanceof Date && !isNaN(transferredAt.getTime())) {
        transferredDate = transferredAt;
      }
      // Handle string conversion
      else if (typeof transferredAt === 'string') {
        // Handle different date string formats
        if (transferredAt.includes('T')) {
          // ISO format
          transferredDate = new Date(transferredAt);
        } else if (transferredAt.includes(' ')) {
          // Format like "2024-01-01 12:00:00"
          transferredDate = new Date(transferredAt.replace(' ', 'T'));
        } else {
          // Try direct conversion
          transferredDate = new Date(transferredAt);
        }
      }
      // Handle objects with toDate() method (Firestore Timestamps)
      else if (typeof transferredAt === 'object' && typeof transferredAt.toDate === 'function') {
        transferredDate = transferredAt.toDate();
      }
      else {
        transferredDate = new Date(transferredAt);
      }
      
      // Check if the date is valid
      if (!transferredDate || isNaN(transferredDate.getTime())) {
        return 'Unknown';
      }
      
      const diff = now.getTime() - transferredDate.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      }
      return `${minutes}m`;
    } catch (error) {
      console.error('Error in getWaitingTime:', error, 'transferredAt:', transferredAt);
      return 'Unknown';
    }
  };

  const loading = ordersLoading || tablesLoading;

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
          <Button onClick={refreshOrders} variant="outline" className="w-full">
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
                <p className="text-sm text-gray-500">Total Pending</p>
                <p className="text-2xl font-bold">{displayOrders.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {displayOrders.filter(o => o.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {displayOrders.filter(o => ['assigned', 'in_progress'].includes(o.status)).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{displayOrders.reduce((sum, order) => sum + order.order.totalAmount, 0).toFixed(2)}
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
              onClick={() => setSelectedStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setSelectedStatus('assigned')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'assigned'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Assigned
            </button>
            <button
              onClick={() => setSelectedStatus('in_progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedStatus === 'in_progress'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              In Progress
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
                : 'No pending orders from staff at the moment'
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
                      <h3 className="text-lg font-semibold">{order.order.orderNumber}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Waiting: {(() => {
                          try {
                            if (!order.transferredAt) return 'Unknown';
                            
                            // Additional safety check - convert Firestore Timestamps inline
                            let transferredAt = order.transferredAt;
                            if (typeof transferredAt === 'object' && transferredAt.seconds && transferredAt.nanoseconds) {
                              transferredAt = new Date(transferredAt.seconds * 1000 + transferredAt.nanoseconds / 1000000);
                            } else if (typeof transferredAt === 'object' && typeof transferredAt.toDate === 'function') {
                              transferredAt = transferredAt.toDate();
                            }
                            
                            return getWaitingTime(transferredAt);
                          } catch (error) {
                            console.error('Error calculating waiting time:', error, 'order.transferredAt:', order.transferredAt);
                            return 'Unknown';
                          }
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{order.order.tableNames.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>Transferred: {(() => {
                          try {
                            if (!order.transferredAt) return 'Invalid Date';
                            
                            // Additional safety check - convert Firestore Timestamps inline
                            let transferredAt = order.transferredAt;
                            if (typeof transferredAt === 'object' && transferredAt.seconds && transferredAt.nanoseconds) {
                              transferredAt = new Date(transferredAt.seconds * 1000 + transferredAt.nanoseconds / 1000000);
                            } else if (typeof transferredAt === 'object' && typeof transferredAt.toDate === 'function') {
                              transferredAt = transferredAt.toDate();
                            }
                            
                            return formatTime(transferredAt);
                          } catch (error) {
                            console.error('Error formatting time:', error, 'order.transferredAt:', order.transferredAt);
                            return 'Invalid Date';
                          }
                        })()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Receipt size={16} />
                        <span>{order.order.items.length} items</span>
                      </div>
                      {order.locationName && (
                        <div className="flex items-center gap-1">
                          <MessageSquare size={16} />
                          <span>{order.locationName}</span>
                        </div>
                      )}
                      {order.createdByName && (
                        <div className="flex items-center gap-1">
                          <UserCheck size={16} />
                          <span>By: {order.createdByName}</span>
                        </div>
                      )}
                      {order.order.customerName && (
                        <div className="flex items-center gap-1">
                          <UserCheck size={16} />
                          <span>{order.order.customerName}</span>
                        </div>
                      )}
                    </div>
                    
                    {order.transferNotes && (
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                        <MessageSquare size={16} className="mt-0.5" />
                        <span>{order.transferNotes}</span>
                      </div>
                    )}
                    
                    <div className="text-lg font-semibold text-gray-900">
                      ₹{order.order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye size={16} />
                    </Button>
                    
                    {order.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                          disabled={isProcessing}
                          title="Edit Order"
                        >
                          <Edit3 size={16} />
                        </Button>
                        
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleViewPrintReceipt(order)}
                          disabled={isProcessing}
                          title="View/Print Receipt"
                        >
                          <Printer size={16} />
                        </Button>
                        
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleSettleOrder(order)}
                          disabled={isProcessing}
                          title="Settle Order"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Settle
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrder(order)}
                          disabled={isProcessing}
                          className="text-red-600 hover:bg-red-50"
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                    
                    {['assigned', 'in_progress'].includes(order.status) && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleSettleBill(order)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <>
                            <CreditCard size={16} />
                            Settle Bill
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modals */}
        {showViewOrder && selectedOrder && (
          <ViewOrderModal
            isOpen={showViewOrder}
            onClose={handleCloseViewOrder}
            order={selectedOrder.order}
          />
        )}

        {showEditOrder && selectedOrder && (
          <EditOrderModal
            isOpen={showEditOrder}
            onClose={handleCloseEditOrder}
            order={{
              ...selectedOrder.order,
              locationId: selectedOrder.order.locationId || ''
            }}
            onSave={handleSaveEditedOrder}
            menuItems={menuItems}
          />
        )}

        {showUnifiedModal && selectedOrder && (
          <CustomerInfoAndPaymentModal
            isOpen={showUnifiedModal}
            onClose={() => {
              setShowUnifiedModal(false);
              setSelectedOrder(null);
              setPendingAction(null);
            }}
            onConfirm={handleUnifiedModalConfirm}
            order={{
              orderId: selectedOrder.order.orderNumber,
              tableNumber: selectedOrder.order.tableNames?.join(', ') || 'N/A',
              totalAmount: selectedOrder.order.totalAmount
            }}
            initialPaymentMethod={selectedPaymentMethod}
            isStaffOrder={!!selectedOrder.createdBy && selectedOrder.createdBy !== 'manager'}
            pendingAction={pendingAction || undefined}
          />
        )}

        {showFinalReceipt && selectedOrder && (
          <FinalReceiptModal
            isOpen={showFinalReceipt}
            onClose={handleCloseFinalReceipt}
            order={selectedOrder.order}
            paymentMethod={selectedPaymentMethod}
            onPaymentComplete={handleCompletePaymentWithReceipt}
            onSettleOrder={handleSettleOrderFromReceipt}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default EnhancedManagerPendingOrdersPage;