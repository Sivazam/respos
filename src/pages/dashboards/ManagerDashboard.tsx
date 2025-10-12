import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useLocations } from '../../contexts/LocationContext';
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Utensils,
  Search,
  DollarSign,
  Table,
  MapPin
} from 'lucide-react';
import Input from '../../components/ui/Input';
import StartOrderButton from '../../components/order/StartOrderButton';
import TableStatusOverview from '../../components/table/TableStatusOverview';
import SettleBillModal from '../../components/order/SettleBillModal';
import ApprovalStatusBanner from '../../components/ui/ApprovalStatusBanner';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import toast from 'react-hot-toast';

const ManagerDashboard: React.FC = () => {
  const { orders, updateOrderStatus, createOrder } = useOrders();
  const { temporaryOrders } = useTemporaryOrdersDisplay();
  const { menuItems } = useMenuItems();
  const { currentLocation } = useLocations();
  const { tables } = useTables();
  const { currentUser } = useAuth();
  const { completeOrder } = useTemporaryOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [showSettleBillModal, setShowSettleBillModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Check if manager has full access (approved + assigned location)
  const hasFullAccess = currentUser?.isApproved && currentUser?.locationId && currentUser?.isActive;
  
  // Get today's orders
  const today = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return { start, end };
  }, []);

  const todaysOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const isToday = orderDate >= today.start && orderDate <= today.end;
      
      // Filter by location if specified
      const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
      
      return isToday && matchesLocation;
    });
  }, [orders, today, selectedLocationId]);

  // Calculate metrics
  const totalRevenue = todaysOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
  const totalOrders = todaysOrders.length;
  const pendingOrders = todaysOrders.filter(order => order.status === 'pending').length;
  const temporaryOrdersCount = temporaryOrders.length;
  const preparingOrders = todaysOrders.filter(order => order.status === 'preparing').length;
  const readyOrders = todaysOrders.filter(order => order.status === 'ready').length;
  const completedOrders = todaysOrders.filter(order => order.status === 'completed').length;
  
  // Table-specific metrics
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;
  const totalTables = tables.length;
  const tableOccupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;
  
  // Order type breakdown
  const dineInOrders = todaysOrders.filter(order => order.orderType === 'dinein').length;
  const takeawayOrders = todaysOrders.filter(order => order.orderType === 'takeaway' || order.orderType === 'delivery').length;
  
  // Average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Orders that need attention (pending and preparing only)
  const ordersNeedingAttention = todaysOrders.filter(order => 
    order.status === 'pending' || 
    order.status === 'preparing'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Filter menu items for search
  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    item.isAvailable
  ).slice(0, 6);

  // Handle order status updates
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  // Handle settle bill for manager
  const handleSettleBill = (order: any) => {
    if (!hasFullAccess) {
      toast.error('You need approval and location assignment to settle bills.');
      return;
    }
    setSelectedOrder(order);
    setShowSettleBillModal(true);
  };

  // Handle settle bill confirmation
  const handleSettleBillConfirm = async (paymentData: any) => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    try {
      // Create a completed order from the temporary order
      const orderData = {
        ...selectedOrder,
        status: 'completed',
        paymentData: {
          paymentMethod: paymentData.method,
          amount: paymentData.amount,
          settledAt: new Date(),
          notes: paymentData.notes
        },
        completedAt: new Date(),
        totalAmount: paymentData.amount
      };

      // Create the order in regular orders collection
      await createOrder(orderData);
      
      // Remove from temporary orders
      await completeOrder(selectedOrder.id);
      
      toast.success('Bill settled successfully!');
      setShowSettleBillModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error settling bill:', error);
      toast.error('Failed to settle bill. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      case 'temporary': return 'bg-purple-100 text-purple-800';
      case 'ongoing': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  // Helper function to get table display name
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

  return (
    <>
      <DashboardLayout title="Manager Dashboard">
        {/* Approval Status Banner */}
        <ApprovalStatusBanner 
          currentUser={currentUser} 
          onRefresh={() => window.location.reload()} 
        />
        
        <div className="space-y-6">
        {/* Location Filter */}
        {currentLocation && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-500" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Current Location</h3>
                  <p className="text-sm text-gray-600">{currentLocation.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Filter:</span>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Locations</option>
                  <option value={currentLocation.id}>{currentLocation.name}</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Today's Revenue
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-green-600 truncate">
                  ₹{totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Avg: ₹{avgOrderValue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Total Orders
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-blue-600">
                  {totalOrders}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {completedOrders} done
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <Table className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Tables
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-purple-600">
                  {occupiedTables}/{totalTables}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {tableOccupancyRate.toFixed(0)}% full
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Need Attention
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-yellow-600">
                  {pendingOrders + preparingOrders}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {pendingOrders} pending, {preparingOrders} preparing
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Completed
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-green-600">
                  {completedOrders}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {readyOrders} ready
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  {hasFullAccess ? (
                    <a href="/manager/pending-orders" className="hover:text-purple-700 transition-colors">
                      Pending Orders
                    </a>
                  ) : (
                    <span className="text-gray-400 cursor-not-allowed">
                      Pending Orders (Approval Required)
                    </span>
                  )}
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-purple-600">
                  {temporaryOrdersCount}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Click to view details
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Needing Attention */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
            Orders Needing Attention ({ordersNeedingAttention.length})
          </h2>
          {ordersNeedingAttention.length > 0 ? (
            <div className="space-y-4">
              {ordersNeedingAttention.map((order) => {
                const waitTime = getOrderWaitTime(order.createdAt);
                return (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Order #{order.id.slice(-8)}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <span className={`text-sm font-medium ${waitTime.color}`}>
                          <Clock className="inline w-4 h-4 mr-1" />
                          {waitTime.text}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        ₹{(order.totalAmount || order.total || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Customer: {order.customerName}</p>
                      <p className="text-sm text-gray-600">
                        {order.orderType === 'dine_in' ? 'Dine In' : 'Take Away'} 
                        {order.tableIds && ` • ${getTableDisplayName(order.tableIds, order.tableNames)}`}
                      </p>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Mark Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Complete Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders need attention right now</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.href = '/manager/tables'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Manage Tables
            </button>
            <button 
              onClick={() => window.location.href = '/manager/catalog'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              View Catalog
            </button>
            <button 
              onClick={() => window.location.href = '/manager/orders'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              View All Orders
            </button>
            <button 
              onClick={() => window.location.href = '/manager/users'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Staff Management
            </button>
          </div>
        </div>
        </div>
      </DashboardLayout>

      {/* Start Order Button - Same as Staff Dashboard */}
      {hasFullAccess ? (
        <StartOrderButton />
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <button 
            disabled 
            className="bg-gray-400 text-white px-6 py-3 rounded-lg shadow-lg cursor-not-allowed opacity-60 flex items-center space-x-2"
            title="You need approval and location assignment to start orders"
          >
            <span>🚫</span>
            <span>Start Order (Approval Required)</span>
          </button>
        </div>
      )}

      {/* Settle Bill Modal */}
      <SettleBillModal
        isOpen={showSettleBillModal}
        onClose={() => {
          setShowSettleBillModal(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSuccess={handleSettleBillConfirm}
        isProcessing={isProcessing}
      />
    </>
  );
};

export default ManagerDashboard;