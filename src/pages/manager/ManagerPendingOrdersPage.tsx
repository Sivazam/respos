import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { format } from 'date-fns';
import { 
  Search, 
  Clock, 
  AlertCircle, 
  Eye,
  Edit,
  Printer,
  Trash2,
  Users,
  DollarSign
} from 'lucide-react';
import Input from '../../components/ui/Input';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import CustomerInfoAndPaymentModal from '../../components/CustomerInfoAndPaymentModal';
import PaymentReceivedModal from '../../components/order/PaymentReceivedModal';
import SettlementConfirmationModal from '../../components/SettlementConfirmationModal';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

const ManagerPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState<'all' | 'staff' | 'me'>('all');
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentReceivedModal, setShowPaymentReceivedModal] = useState(false);
  const [showSettlementConfirmationModal, setShowSettlementConfirmationModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderTotals, setOrderTotals] = useState<{ [key: string]: number }>({});
  const [pendingAction, setPendingAction] = useState<'settle' | 'print' | null>(null);
  const [orderCreators, setOrderCreators] = useState<{ [key: string]: { email: string; role: string; displayName?: string } }>({});
  const [existingCustomerData, setExistingCustomerData] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'staff' | 'manager' | undefined>(undefined);

  // Subscribe to manager pending orders
  useEffect(() => {
    if (!currentUser?.locationId) return;

    setLoading(true);
    const unsubscribe = orderService.subscribeToManagerPendingOrders(
      currentUser.locationId,
      (orders) => {
        setPendingOrders(orders);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.locationId]);

  // Calculate order totals when orders change
  useEffect(() => {
    const calculateTotals = async () => {
      const totals: { [key: string]: number } = {};
      
      for (const pendingOrder of pendingOrders) {
        const order = pendingOrder.order || pendingOrder;
        if (!totals[order.id]) {
          totals[order.id] = await calculateOrderTotal(order);
        }
      }
      
      setOrderTotals(totals);
    };

    if (pendingOrders.length > 0) {
      calculateTotals();
    }
  }, [pendingOrders]);

  // Fetch order creator details when orders change
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const creators: { [key: string]: { email: string; role: string; displayName?: string } } = {};
      
      for (const pendingOrder of pendingOrders) {
        const order = pendingOrder.order || pendingOrder;
        
        // Fetch creator details if not already cached
        if (order.staffId && !creators[order.staffId]) {
          const creatorDetails = await orderService.getUserDetails(order.staffId);
          if (creatorDetails) {
            creators[order.staffId] = creatorDetails;
          }
        }
        
        // Fetch transferred by details if available and not already cached
        if (order.transferredBy && !creators[order.transferredBy]) {
          const transferDetails = await orderService.getUserDetails(order.transferredBy);
          if (transferDetails) {
            creators[order.transferredBy] = transferDetails;
          }
        }
      }
      
      setOrderCreators(creators);
    };

    if (pendingOrders.length > 0) {
      fetchOrderDetails();
    }
  }, [pendingOrders]);

  // Filter pending orders
  const filteredOrders = useMemo(() => {
    return pendingOrders.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      const orderData = order.order || order;
      
      // Search filter
      const matchesSearch = (
        orderData.orderNumber?.toLowerCase().includes(searchLower) ||
        orderData.customerName?.toLowerCase().includes(searchLower) ||
        orderData.tableNames?.some((table: string) => table.toLowerCase().includes(searchLower)) ||
        orderData.items?.some((item: any) => item.name.toLowerCase().includes(searchLower))
      );
      
      // Created by filter
      let matchesCreatedBy = true;
      if (createdByFilter === 'me') {
        matchesCreatedBy = orderData.staffId === currentUser?.uid;
      } else if (createdByFilter === 'staff') {
        matchesCreatedBy = orderCreators[orderData.staffId]?.role === 'staff';
      }
      
      return matchesSearch && matchesCreatedBy;
    });
  }, [pendingOrders, searchTerm, createdByFilter, currentUser?.uid, orderCreators]);

  // Handle settle bill
  const handleSettleBill = async (order: any) => {
    const orderData = order.order || order;
    
    // Find the latest order data from pendingOrders state
    const latestPendingOrder = pendingOrders.find(pendingOrder => {
      const pendingOrderData = pendingOrder.order || pendingOrder;
      return pendingOrderData.id === orderData.id;
    });
    
    const latestOrderData = latestPendingOrder?.order || latestPendingOrder || orderData;
    
    console.log('💰 Settle bill - latest data from pendingOrders:', {
      orderId: latestOrderData.id,
      paymentMethod: latestOrderData.paymentMethod,
      pendingPaymentMethod: latestOrderData.pendingPaymentMethod,
      customerInfo: latestOrderData.customerInfo
    });
    
    setSelectedOrder(latestOrderData);
    setPendingAction('settle');
    
    // Check if customer data and payment method are already collected
    try {
      // First check if data exists in order document
      const hasOrderCustomerData = latestOrderData.customerInfo && 
        (latestOrderData.customerInfo.name || latestOrderData.customerInfo.phone || latestOrderData.customerInfo.city);
      const hasOrderPaymentMethod = latestOrderData.paymentMethod || latestOrderData.pendingPaymentMethod;
      
      let customerData = null;
      let paymentMethod = hasOrderPaymentMethod ? (latestOrderData.paymentMethod || latestOrderData.pendingPaymentMethod) : null;
      let firestoreCustomerData = null; // Declare variable in proper scope for handleSettleBill
      
      // If not in order, check Firestore customer_data collection
      if (!hasOrderCustomerData || !hasOrderPaymentMethod) {
        const { fetchCustomerDataByOrderId } = await import('../../contexts/CustomerDataService');
        firestoreCustomerData = await fetchCustomerDataByOrderId(latestOrderData.id);
        
        if (firestoreCustomerData) {
          customerData = {
            name: firestoreCustomerData.name,
            phone: firestoreCustomerData.phone,
            city: firestoreCustomerData.city
          };
          // Use payment method from Firestore if not in order
          if (!paymentMethod && firestoreCustomerData.paymentMethod) {
            paymentMethod = firestoreCustomerData.paymentMethod;
          }
        }
      } else {
        // Use data from order document
        customerData = latestOrderData.customerInfo;
      }
      
      // Combine data for the modal
      const combinedCustomerData = customerData || {};
      // Don't default to 'cash' - use the actual payment method or let it be undefined
      const finalPaymentMethod = paymentMethod;
      
      // Store existing customer data to pass to modal if needed
      setExistingCustomerData({
        ...combinedCustomerData,
        paymentMethod: finalPaymentMethod
      });
      
      // Determine data source for UI badge
      let dataSourceValue: 'staff' | 'manager' | undefined;
      if (firestoreCustomerData) {
        dataSourceValue = firestoreCustomerData.source;
      } else if (hasOrderPaymentMethod || hasOrderCustomerData) {
        dataSourceValue = 'manager'; // If data is in order document, it's from manager
      }
      
      setDataSource(dataSourceValue);
      
      const hasCustomerData = combinedCustomerData && (combinedCustomerData.name || combinedCustomerData.phone || combinedCustomerData.city);
      const hasPaymentMethod = finalPaymentMethod && finalPaymentMethod !== 'cash';
      
      console.log('🧾 Settle bill - existing data:', {
        customerData: combinedCustomerData,
        paymentMethod: finalPaymentMethod,
        dataSource: dataSourceValue,
        hasCustomerData,
        hasPaymentMethod,
        orderPaymentMethod: latestOrderData.paymentMethod,
        orderPendingPaymentMethod: latestOrderData.pendingPaymentMethod
      });
      
      if (hasCustomerData && hasPaymentMethod) {
        // Both customer data and payment method are already collected, show confirmation modal
        setShowSettlementConfirmationModal(true);
      } else {
        // Need to collect customer data and/or payment method
        setShowUnifiedModal(true);
      }
    } catch (error) {
      console.error('Error checking customer data:', error);
      // Fallback to showing modal if there's an error
      setShowUnifiedModal(true);
    }
  };

  // Handle view order
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order.order || order);
    setShowViewOrderModal(true);
  };

  // Handle edit order
  const handleEditOrder = (order: any) => {
    const orderData = order.order || order;
    
    // Navigate to ManagerPOSPage with order data
    navigate('/manager/pos', {
      state: {
        orderType: orderData.orderType === 'dinein' ? 'dinein' : (orderData.orderType === 'delivery' ? 'delivery' : 'dinein'),
        tableIds: orderData.tableIds || [],
        tableNames: orderData.tableNames || [],
        isOngoing: true,
        fromLocation: '/manager/pending-orders',
        orderId: orderData.id,
        orderMode: orderData.orderMode || 'in-store'
      }
    });
  };

  // Handle print order
  const handlePrintOrder = async (order: any) => {
    const orderData = order.order || order;
    
    // Find the latest order data from pendingOrders state
    const latestPendingOrder = pendingOrders.find(pendingOrder => {
      const pendingOrderData = pendingOrder.order || pendingOrder;
      return pendingOrderData.id === orderData.id;
    });
    
    const latestOrderData = latestPendingOrder?.order || latestPendingOrder || orderData;
    
    console.log('🖨️ Print order - latest data from pendingOrders:', {
      orderId: latestOrderData.id,
      paymentMethod: latestOrderData.paymentMethod,
      pendingPaymentMethod: latestOrderData.pendingPaymentMethod,
      customerInfo: latestOrderData.customerInfo
    });
    
    setSelectedOrder(latestOrderData);
    setPendingAction('print');
    
    // Fetch existing customer data to pre-fill the modal
    try {
      // First check if data exists in order document
      const hasOrderCustomerData = latestOrderData.customerInfo && 
        (latestOrderData.customerInfo.name || latestOrderData.customerInfo.phone || latestOrderData.customerInfo.city);
      const hasOrderPaymentMethod = latestOrderData.paymentMethod || latestOrderData.pendingPaymentMethod;
      
      let customerData = null;
      let paymentMethod = hasOrderPaymentMethod ? (latestOrderData.paymentMethod || latestOrderData.pendingPaymentMethod) : null;
      let firestoreCustomerData = null; // Declare variable in proper scope for handlePrintOrder
      
      // If not in order, check Firestore customer_data collection
      if (!hasOrderCustomerData || !hasOrderPaymentMethod) {
        const { fetchCustomerDataByOrderId } = await import('../../contexts/CustomerDataService');
        firestoreCustomerData = await fetchCustomerDataByOrderId(latestOrderData.id);
        
        if (firestoreCustomerData) {
          customerData = {
            name: firestoreCustomerData.name,
            phone: firestoreCustomerData.phone,
            city: firestoreCustomerData.city
          };
          // Use payment method from Firestore if not in order
          if (!paymentMethod && firestoreCustomerData.paymentMethod) {
            paymentMethod = firestoreCustomerData.paymentMethod;
          }
        }
      } else {
        // Use data from order document
        customerData = latestOrderData.customerInfo;
      }
      
      // Combine data for the modal
      const combinedCustomerData = customerData || {};
      // Don't default to 'cash' - use the actual payment method or let it be undefined
      const finalPaymentMethod = paymentMethod;
      
      // Store existing customer data to pass to modal
      setExistingCustomerData({
        ...combinedCustomerData,
        paymentMethod: finalPaymentMethod
      });
      
      // Determine data source for UI badge
      let dataSourceValue: 'staff' | 'manager' | undefined;
      if (firestoreCustomerData) {
        dataSourceValue = firestoreCustomerData.source;
      } else if (hasOrderPaymentMethod || hasOrderCustomerData) {
        dataSourceValue = 'manager'; // If data is in order document, it's from manager
      }
      
      setDataSource(dataSourceValue);
      
      console.log('📄 Print order - existing data:', {
        customerData: combinedCustomerData,
        paymentMethod: finalPaymentMethod,
        dataSource: dataSourceValue,
        orderPaymentMethod: latestOrderData.paymentMethod,
        orderPendingPaymentMethod: latestOrderData.pendingPaymentMethod
      });
    } catch (error) {
      console.error('Error fetching customer data for print:', error);
      setExistingCustomerData(null);
    }
    
    // Always show unified modal for both staff and manager orders
    setShowUnifiedModal(true);
  };

  // Handle delete order
  const handleDeleteOrder = async (order: any) => {
    const orderData = order.order || order;
    if (window.confirm(`Are you sure you want to delete order #${orderData.orderNumber}?`)) {
      try {
        await orderService.deleteOrder(orderData.id, currentUser?.uid || '');
        toast.success('Order deleted successfully!');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order. Please try again.');
      }
    }
  };

  // Handle unified modal confirmation
  const handleUnifiedModalConfirm = async (customerData: { name?: string; phone?: string; city?: string }, paymentMethod: string) => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    
    try {
      // Save customer data and payment method to Firestore
      const { upsertCustomerData } = await import('../../contexts/CustomerDataService');
      
      console.log('🔍 Debug - ManagerPendingOrdersPage saving data with:', {
        orderId: selectedOrder.id,
        customerData: {
          ...customerData,
          paymentMethod: paymentMethod as 'cash' | 'card' | 'upi'
        },
        userId: currentUser?.uid,
        locationId: selectedOrder.locationId
      });
      
      await upsertCustomerData(
        selectedOrder.id, 
        {
          ...customerData,
          paymentMethod: paymentMethod as 'cash' | 'card' | 'upi'
        }, 
        'manager', 
        Date.now(),
        currentUser?.uid || 'unknown',
        selectedOrder.locationId || 'unknown'
      );
      console.log('✅ Customer data and payment method saved by manager');
      
      // Update order document with customer info and payment method
      await orderService.updateOrder(selectedOrder.id, {
        customerInfo: customerData,
        paymentMethod: paymentMethod
      }, currentUser.uid);
      console.log('✅ Order document updated with customer info and payment method');
      
      // Update local state
      const updatedOrder = {
        ...selectedOrder,
        customerInfo: customerData,
        paymentMethod: paymentMethod,
        pendingPaymentMethod: paymentMethod
      };
      setSelectedOrder(updatedOrder);
      
      // Update the pendingOrders state to reflect the changes
      setPendingOrders(prevOrders => {
        const updatedOrders = prevOrders.map(pendingOrder => {
          const orderData = pendingOrder.order || pendingOrder;
          if (orderData.id === selectedOrder.id) {
            const updatedOrderData = {
              ...orderData,
              customerInfo: customerData,
              paymentMethod: paymentMethod,
              pendingPaymentMethod: paymentMethod
            };
            console.log('🔄 Updating pending order in state:', {
              orderId: orderData.id,
              oldPaymentMethod: orderData.paymentMethod,
              newPaymentMethod: paymentMethod,
              oldPendingPaymentMethod: orderData.pendingPaymentMethod,
              newPendingPaymentMethod: paymentMethod
            });
            return {
              ...pendingOrder,
              order: updatedOrderData
            };
          }
          return pendingOrder;
        });
        
        console.log('📋 Updated pendingOrders state:', updatedOrders.map(o => ({
          id: (o.order || o).id,
          paymentMethod: (o.order || o).paymentMethod,
          pendingPaymentMethod: (o.order || o).pendingPaymentMethod
        })));
        
        return updatedOrders;
      });
      
      setShowUnifiedModal(false);
      
      // Handle based on which flow we're in
      if (pendingAction === 'settle') {
        // Settle flow - show confirmation modal
        setShowSettlementConfirmationModal(true);
        setPendingAction(null);
        // Clear existing customer data after showing confirmation modal
        setExistingCustomerData(null);
        setDataSource(undefined);
      } else if (pendingAction === 'print') {
        // Print flow - show receipt with a small delay to ensure modal closes properly
        const currentOrder = updatedOrder; // Capture the current order state
        setTimeout(() => {
          setSelectedOrder(currentOrder); // Ensure the order state is set
          setShowReceiptModal(true);
          console.log('🧾 Opening receipt modal for order:', currentOrder.id);
          console.log('🧾 Receipt modal order data:', {
            paymentMethod: currentOrder.paymentMethod,
            pendingPaymentMethod: currentOrder.pendingPaymentMethod,
            customerInfo: currentOrder.customerInfo
          });
        }, 200);
        toast.success('Payment method selected!');
        // Clear pending action after setting timeout to ensure it still executes
        setPendingAction(null);
        // Clear existing customer data after showing receipt modal
        setTimeout(() => {
          setExistingCustomerData(null);
          setDataSource(undefined);
        }, 300);
      } else {
        // Clear pending action if it's neither settle nor print
        setPendingAction(null);
        // Clear existing customer data for other cases
        setExistingCustomerData(null);
        setDataSource(undefined);
      }
      
    } catch (error: any) {
      console.error('Error processing unified modal:', error);
      toast.error(error.message || 'Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle settlement confirmation
  const handleSettlementConfirmation = async () => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    try {
      const total = orderTotals[selectedOrder.id] || await calculateOrderTotal(selectedOrder);
      const paymentMethod = selectedOrder.paymentMethod || selectedOrder.pendingPaymentMethod || 'cash';
      
      await orderService.settleOrder(selectedOrder.id, {
        paymentMethod: paymentMethod,
        amount: total,
        settledAt: new Date(),
        settledBy: currentUser.uid
      });
      
      toast.success('Payment received and order settled!');
      setShowSettlementConfirmationModal(false);
      setSelectedOrder(null);
      setExistingCustomerData(null);
      setDataSource(undefined);
      setPendingAction(null);
    } catch (error) {
      console.error('Error settling payment:', error);
      toast.error('Failed to settle payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment received confirmation
  const handlePaymentReceivedConfirm = async () => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    try {
      const total = orderTotals[selectedOrder.id] || await calculateOrderTotal(selectedOrder);
      
      // Use pendingPaymentMethod from the selected order
      const paymentMethodToUse = selectedOrder.pendingPaymentMethod;
      
      if (!paymentMethodToUse) {
        toast.error('No payment method selected. Please select a payment method first.');
        setShowPaymentReceivedModal(false);
        setShowUnifiedModal(true);
        return;
      }
      
      // Settle the existing order using orderService (this will update it to completed status)
      await orderService.settleOrder(selectedOrder.id, {
        paymentMethod: paymentMethodToUse,
        amount: total,
        settledAt: new Date(),
        settledBy: currentUser.uid
      });
      
      toast.success('Payment received and order settled!');
      setShowPaymentReceivedModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error settling payment:', error);
      toast.error('Failed to settle payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit payment method from receipt
  const handleEditPaymentMethod = () => {
    setShowReceiptModal(false);
    setPendingAction('print'); // Keep it in print flow
    setShowUnifiedModal(true);
  };

  // Get table display name
  const getTableDisplayName = (tableIds?: string[], tableNames?: string[]) => {
    if (tableNames && tableNames.length > 0) {
      return tableNames.join(', ');
    }
    
    if (tableIds && tableIds.length > 0) {
      const tableNumbers = tableIds.map(id => {
        const tableMatch = id.match(/table-(\d+)/i);
        if (tableMatch) {
          return `Table ${tableMatch[1]}`;
        }
        if (/^\d+$/.test(id)) {
          return `Table ${id}`;
        }
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `Table ${numberMatch[0]}`;
        }
        return id;
      });
      return tableNumbers.join(', ');
    }
    
    return 'N/A';
  };

  // Calculate order total using the same method as orderService
  const calculateOrderTotal = async (order: any) => {
    const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    
    // Use the order's existing tax calculations if available
    if (order.gstAmount !== undefined) {
      return subtotal + order.gstAmount;
    }
    
    // Otherwise, calculate using location GST settings
    if (order.locationId) {
      try {
        const gstSettings = await orderService.getLocationGSTSettings(order.locationId);
        const totalGST = subtotal * ((gstSettings.cgst + gstSettings.sgst) / 100);
        return subtotal + totalGST;
      } catch (error) {
        console.error('Error calculating order total:', error);
        // Fallback to 0% GST
        return subtotal;
      }
    }
    
    // Fallback to subtotal only (0% GST)
    return subtotal;
  };

  // Get order wait time
  const getOrderWaitTime = (orderCreatedAt: string) => {
    const now = new Date().getTime();
    const created = new Date(orderCreatedAt).getTime();
    const minutes = Math.floor((now - created) / (1000 * 60));
    
    if (minutes < 5) return { text: `${minutes}m`, color: 'text-green-600' };
    if (minutes < 15) return { text: `${minutes}m`, color: 'text-yellow-600' };
    return { text: `${minutes}m`, color: 'text-red-600' };
  };

  return (
    <>
      <DashboardLayout title="Pending Orders">
        <div className="space-y-6">
          {/* Search Bar - Mobile First */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Search by order number, customer name, table, or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
              </div>
              <div className="text-sm text-gray-600 text-center sm:text-right">
                {loading ? 'Loading...' : `${filteredOrders.length} orders found`}
              </div>
            </div>
            
            {/* Created By Filter - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Created By:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCreatedByFilter('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                    createdByFilter === 'all'
                      ? 'bg-gray-800 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setCreatedByFilter('staff')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                    createdByFilter === 'staff'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => setCreatedByFilter('me')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                    createdByFilter === 'me'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Me
                </button>
              </div>
            </div>
          </div>

          {/* Loading State - Mobile Optimized */}
          {loading && (
            <div className="bg-white shadow rounded-lg p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <div className="text-gray-500 text-sm sm:text-base">Loading pending orders...</div>
              </div>
            </div>
          )}

          {/* Empty State - Mobile Optimized */}
          {!loading && filteredOrders.length === 0 && (
            <div className="bg-white shadow rounded-lg p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                <div>
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">No pending orders</h3>
                  <p className="text-sm sm:text-base text-gray-500">
                    {searchTerm || createdByFilter !== 'all' 
                      ? 'No orders match your filters' 
                      : 'No pending orders at the moment'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Orders List - Mobile First Cards */}
          {!loading && filteredOrders.length > 0 && (
            <div className="space-y-4">
              {filteredOrders.map((pendingOrder) => {
                const order = pendingOrder.order || pendingOrder;
                const waitTime = getOrderWaitTime(order.createdAt || order.transferredAt);
                const total = orderTotals[order.id] || 0;
                
                return (
                  <div key={pendingOrder.id || order.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                    {/* Mobile Card Header */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">#{order.orderNumber}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                order.orderType === 'dinein' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {order.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}
                              </span>
                              {order.tableIds && (
                                <span className="flex items-center">
                                  <Users size={14} className="mr-1" />
                                  {getTableDisplayName(order.tableIds, order.tableNames)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${waitTime.color}`}>
                            <Clock className="inline w-4 h-4 mr-1" />
                            {waitTime.text}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(order.createdAt || order.transferredAt), 'dd MMM, HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {(order.customerName || 'Guest').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{order.customerName || 'Guest'}</p>
                            {orderCreators[order.staffId] && (
                              <p className="text-xs text-gray-500">
                                Created by {orderCreators[order.staffId].displayName || orderCreators[order.staffId].email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">₹{total.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{order.items?.length || 0} items</p>
                        </div>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100">
                      <div className="space-y-2">
                        {order.items?.slice(0, 3).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500">{item.quantity}x</span>
                              <span className="text-gray-900 font-medium">{item.name}</span>
                            </div>
                            <span className="text-gray-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <div className="text-xs text-gray-500 text-center pt-2">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Mobile First */}
                    <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {/* Primary Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                          <button
                            onClick={() => handleSettleBill(pendingOrder)}
                            className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
                          >
                            <DollarSign size={16} />
                            <span>Settle Bill</span>
                          </button>
                          <button
                            onClick={() => handlePrintOrder(pendingOrder)}
                            className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
                          >
                            <Printer size={16} />
                            <span>Print</span>
                          </button>
                        </div>
                        
                        {/* Secondary Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewOrder(pendingOrder)}
                            className="p-2.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 transform active:scale-95"
                            title="View Order"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditOrder(pendingOrder)}
                            className="p-2.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-200 transform active:scale-95"
                            title="Edit Order"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(pendingOrder)}
                            className="p-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 transform active:scale-95"
                            title="Delete Order"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {/* View Order Modal */}
      {showViewOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Order #{selectedOrder.orderNumber}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-700">Customer Information</h4>
                        <p className="text-sm text-gray-600">{selectedOrder.customerName || 'Guest'}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700">Items</h4>
                        <div className="space-y-2">
                          {selectedOrder.items?.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>₹{(orderTotals[selectedOrder.id] || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowViewOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Customer Info and Payment Modal */}
      {showUnifiedModal && selectedOrder && (
        <CustomerInfoAndPaymentModal
          isOpen={showUnifiedModal}
          onClose={() => {
            setShowUnifiedModal(false);
            setSelectedOrder(null);
            setPendingAction(null);
            setExistingCustomerData(null);
            setDataSource(undefined);
          }}
          onConfirm={handleUnifiedModalConfirm}
          order={{
            orderId: selectedOrder.orderNumber,
            tableNumber: getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames),
            totalAmount: orderTotals[selectedOrder.id] || 0
          }}
          initialCustomerInfo={existingCustomerData ? {
        name: existingCustomerData.name,
        phone: existingCustomerData.phone,
        city: existingCustomerData.city
      } : undefined}
          initialPaymentMethod={existingCustomerData?.paymentMethod || selectedOrder.pendingPaymentMethod || selectedOrder.paymentMethod}
          isStaffOrder={!!selectedOrder.staffId && selectedOrder.staffId !== currentUser?.uid}
          pendingAction={pendingAction || undefined}
          dataSource={dataSource}
        />
      )}

      {/* Final Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <FinalReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedOrder(null);
          }}
          order={{
            ...selectedOrder,
            paymentData: selectedOrder.paymentData || {
              paymentMethod: selectedOrder.paymentMethod || selectedOrder.pendingPaymentMethod,
              amount: orderTotals[selectedOrder.id] || 0,
              settledAt: new Date()
            }
          }}
          paymentMethod={selectedOrder.paymentMethod || selectedOrder.pendingPaymentMethod || 'cash'}
          isReadOnly={false}
          onEditPaymentMethod={handleEditPaymentMethod}
        />
      )}

      {/* Payment Received Modal */}
      <PaymentReceivedModal
        isOpen={showPaymentReceivedModal}
        onClose={() => {
          setShowPaymentReceivedModal(false);
          setSelectedOrder(null);
        }}
        onConfirm={handlePaymentReceivedConfirm}
        isProcessing={isProcessing}
      />

      {/* Settlement Confirmation Modal */}
      {showSettlementConfirmationModal && selectedOrder && (
        <SettlementConfirmationModal
          isOpen={showSettlementConfirmationModal}
          onClose={() => {
            setShowSettlementConfirmationModal(false);
            setSelectedOrder(null);
            setExistingCustomerData(null);
            setDataSource(undefined);
            setPendingAction(null);
          }}
          onConfirm={handleSettlementConfirmation}
          order={{
            orderNumber: selectedOrder.orderNumber,
            tableNumber: getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames),
            totalAmount: orderTotals[selectedOrder.id] || 0
          }}
          customerInfo={selectedOrder.customerInfo || existingCustomerData}
          paymentMethod={selectedOrder.paymentMethod || selectedOrder.pendingPaymentMethod || existingCustomerData?.paymentMethod}
          isProcessing={isProcessing}
        />
      )}

      {/* View Order Modal */}
      {showViewOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Order Details - #{selectedOrder.orderNumber}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-700">Customer Information</h4>
                        <p className="text-sm text-gray-600">Name: {selectedOrder.customerName || 'Guest'}</p>
                        <p className="text-sm text-gray-600">Type: {selectedOrder.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}</p>
                        <p className="text-sm text-gray-600">Table: {getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames)}</p>
                        <p className="text-sm text-gray-600">Date: {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-700">Order Items</h4>
                        <div className="mt-2 space-y-2">
                          {selectedOrder.items?.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>CGST:</span>
                          <span>₹{((selectedOrder.cgstAmount || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>SGST:</span>
                          <span>₹{((selectedOrder.sgstAmount || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>₹{(orderTotals[selectedOrder.id] || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowViewOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Edit Order - #{selectedOrder.orderNumber}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> To edit this order, you'll be redirected to the Manager POS page where you can modify the items.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700">Current Order Information</h4>
                        <p className="text-sm text-gray-600">Customer: {selectedOrder.customerName || 'Guest'}</p>
                        <p className="text-sm text-gray-600">Table: {getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames)}</p>
                        <p className="text-sm text-gray-600">Items: {selectedOrder.items?.length || 0}</p>
                        <p className="text-sm text-gray-600">Total: ₹{(orderTotals[selectedOrder.id] || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    // Navigate to POS with order data for editing
                    navigate('/pos', {
                      state: {
                        orderType: selectedOrder.orderType || 'dinein',
                        tableIds: selectedOrder.tableIds || [],
                        isOngoing: true,
                        fromLocation: '/manager/pending-orders',
                        orderId: selectedOrder.id
                      }
                    });
                    setShowEditOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Edit in POS
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowEditOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default ManagerPendingOrdersPage;