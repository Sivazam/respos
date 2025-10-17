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
  Utensils,
  Search,
  Table,
  MapPin
} from 'lucide-react';
import Input from '../../components/ui/Input';
import StartOrderButton from '../../components/order/StartOrderButton';
import TableStatusOverview from '../../components/table/TableStatusOverview';
import ApprovalStatusBanner from '../../components/ui/ApprovalStatusBanner';

const StaffDashboard: React.FC = () => {
  const { orders, updateOrderStatus } = useOrders();
  const { temporaryOrders } = useTemporaryOrdersDisplay();
  const { menuItems } = useMenuItems();
  const { currentLocation } = useLocations();
  const { tables } = useTables();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  // Check if staff has full access (approved + assigned location)
  const hasFullAccess = currentUser?.isApproved && currentUser?.locationId && currentUser?.isActive;
  
  // Get today's orders
  const today = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return { start, end };
  }, []);

  // Get today's orders for this staff member only
  const todaysOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const isToday = orderDate >= today.start && orderDate <= today.end;
      
      // Filter by location if specified
      const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
      
      // Only show orders assigned to this staff member
      const matchesStaff = order.staffId === currentUser?.uid;
      
      return isToday && matchesLocation && matchesStaff;
    });
  }, [orders, today, selectedLocationId, currentUser?.uid]);

  // Get this staff member's assigned tables
  const assignedTables = useMemo(() => {
    if (!currentUser?.uid) return [];
    
    // Filter tables that are assigned to this staff member
    return tables.filter(table => {
      // Check if table has assignedStaff field and matches current user
      return table.assignedStaff === currentUser.uid || 
             table.staffId === currentUser.uid ||
             (table.assignedStaffIds && table.assignedStaffIds.includes(currentUser.uid));
    });
  }, [tables, currentUser?.uid]);

  // Get orders for assigned tables only
  const assignedTableOrders = useMemo(() => {
    const assignedTableIds = assignedTables.map(table => table.id);
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const isToday = orderDate >= today.start && orderDate <= today.end;
      
      // Check if order is for any of the assigned tables
      const hasAssignedTable = order.tableIds?.some(tableId => 
        assignedTableIds.includes(tableId)
      );
      
      return isToday && hasAssignedTable;
    });
  }, [orders, today, assignedTables]);

  // Calculate staff-specific performance metrics
  const staffMetrics = useMemo(() => {
    // Today's performance
    const todayRevenue = todaysOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
    const todayOrders = todaysOrders.length;
    const todayCompletedOrders = todaysOrders.filter(order => order.status === 'completed' || order.status === 'settled').length;
    const todayAvgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;
    
    // Payment method breakdown
    const upiOrders = todaysOrders.filter(order => order.paymentMethod === 'upi').length;
    const cashOrders = todaysOrders.filter(order => order.paymentMethod === 'cash').length;
    const cardOrders = todaysOrders.filter(order => order.paymentMethod === 'card').length;
    
    // Order type breakdown
    const dineInOrders = todaysOrders.filter(order => order.orderType === 'dinein').length;
    const deliveryOrders = todaysOrders.filter(order => order.orderType === 'delivery').length;
    
    // Total items sold
    const totalItems = todaysOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    // Average order completion time (for completed orders)
    const completedOrdersWithTime = todaysOrders.filter(order => 
      (order.status === 'completed' || order.status === 'settled') && 
      order.completedAt && 
      order.createdAt
    );
    
    const avgCompletionTime = completedOrdersWithTime.length > 0 
      ? completedOrdersWithTime.reduce((sum, order) => {
          const completionTime = new Date(order.completedAt).getTime();
          const createdTime = new Date(order.createdAt).getTime();
          return sum + (completionTime - createdTime);
        }, 0) / completedOrdersWithTime.length / (1000 * 60) // Convert to minutes
      : 0;

    // Peak hours analysis
    const hourOrders: { [hour: string]: number } = {};
    todaysOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const hourKey = `${hour}:00`;
      hourOrders[hourKey] = (hourOrders[hourKey] || 0) + 1;
    });

    const peakHours = Object.entries(hourOrders)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour, count }));

    // Top selling items
    const itemSales: { [key: string]: number } = {};
    todaysOrders.forEach(order => {
      order.items.forEach(item => {
        const itemName = item.name || item.itemName || 'Unknown Item';
        itemSales[itemName] = (itemSales[itemName] || 0) + item.quantity;
      });
    });

    const topItems = Object.entries(itemSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      todayRevenue,
      todayOrders,
      todayCompletedOrders,
      todayAvgOrderValue,
      upiOrders,
      cashOrders,
      cardOrders,
      dineInOrders,
      deliveryOrders,
      totalItems,
      avgCompletionTime,
      peakHours,
      topItems
    };
  }, [todaysOrders]);

  // Current status metrics
  const pendingOrders = todaysOrders.filter(order => order.status === 'pending').length;
  const preparingOrders = todaysOrders.filter(order => order.status === 'preparing').length;
  const readyOrders = todaysOrders.filter(order => order.status === 'ready').length;
  const temporaryOrdersCount = temporaryOrders.length;
  
  // Table-specific metrics for assigned tables
  const occupiedAssignedTables = assignedTables.filter(table => table.status === 'occupied').length;
  const totalAssignedTables = assignedTables.length;
  const assignedTableOccupancyRate = totalAssignedTables > 0 ? (occupiedAssignedTables / totalAssignedTables) * 100 : 0;

  // Orders that need attention (pending and preparing only)
  // Temporary orders should only appear in the Pending Orders page, not here
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

  // Helper function to get table display name from order object
  const getOrderTableDisplay = (order: any) => {
    // First try to use tableNames if available
    if (order.tableNames && order.tableNames.length > 0) {
      return order.tableNames.join(', ');
    }
    
    // Then try tableIds
    if (order.tableIds && order.tableIds.length > 0) {
      return getTableDisplayName(order.tableIds);
    }
    
    // Fall back to tableNumber if available (legacy support)
    if (order.tableNumber) {
      return `Table ${order.tableNumber}`;
    }
    
    return 'N/A';
  };

  return (
    <>
      <DashboardLayout title="Staff Dashboard">
        {/* Approval Status Banner */}
        <ApprovalStatusBanner 
          currentUser={currentUser} 
          onRefresh={() => window.location.reload()} 
        />
        
        <div className="space-y-6">
        {/* Location Info Only - Filter dropdown hidden */}
        {currentLocation && (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Current Location</h3>
                <p className="text-sm text-gray-600">{currentLocation.name}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Staff Performance Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  My Orders
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-blue-600">
                  {staffMetrics.todayOrders}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {staffMetrics.todayCompletedOrders} completed
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
                  My Tables
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-purple-600">
                  {occupiedAssignedTables}/{totalAssignedTables}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {assignedTableOccupancyRate.toFixed(0)}% occupied
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Avg Time
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-orange-600">
                  {staffMetrics.avgCompletionTime.toFixed(0)}m
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Per order
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Performance Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Order Types Breakdown */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Order Types</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Dine-in</span>
                <span className="text-sm font-semibold text-purple-600">{staffMetrics.dineInOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivery</span>
                <span className="text-sm font-semibold text-red-600">{staffMetrics.deliveryOrders}</span>
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Peak Hours</h3>
            <div className="space-y-3">
              {staffMetrics.peakHours.length > 0 ? (
                staffMetrics.peakHours.map((peak, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{peak.hour}</span>
                    <span className="text-sm font-semibold text-orange-600">{peak.count} orders</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No orders yet today</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        {staffMetrics.topItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">My Top Selling Items</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {staffMetrics.topItems.map((item, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{item.quantity}</div>
                  <div className="text-xs text-gray-600 truncate">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Needing Attention - Mobile First */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
            Orders Needing Attention ({ordersNeedingAttention.length})
          </h2>
          {ordersNeedingAttention.length > 0 ? (
            <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
              {ordersNeedingAttention.map((order) => {
                const waitTime = getOrderWaitTime(order.createdAt);
                return (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow duration-200">
                    {/* Mobile Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <h3 className="text-sm font-bold text-gray-900">
                          #{order.id.slice(-8)}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className={`text-sm font-bold ${waitTime.color}`}>
                          <Clock className="inline w-4 h-4 mr-1" />
                          {waitTime.text}
                        </span>
                        <div className="text-sm font-bold text-gray-900">
                          ₹{(order.totalAmount || order.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Customer and Order Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Customer:</span>
                        <span>{order.customerName || 'Guest'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Type:</span>
                        <span>{order.orderType === 'dine_in' ? 'Dine In' : 'Take Away'}</span>
                        {getOrderTableDisplay(order) && (
                          <span className="flex items-center gap-1">
                            <span>•</span>
                            <span>{getOrderTableDisplay(order)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Items:</p>
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <div className="text-xs text-gray-400 text-center pt-1">
                            +{order.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Mobile First */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => hasFullAccess && handleUpdateOrderStatus(order.id, 'preparing')}
                          disabled={!hasFullAccess}
                          className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                            hasFullAccess 
                              ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {hasFullAccess ? 'Start Preparing' : 'Start Preparing (Approval Required)'}
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => hasFullAccess && handleUpdateOrderStatus(order.id, 'ready')}
                          disabled={!hasFullAccess}
                          className={`flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 transform active:scale-95 ${
                            hasFullAccess 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {hasFullAccess ? 'Mark Ready' : 'Mark Ready (Approval Required)'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 transform active:scale-95"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Orders Caught Up!</h3>
              <p className="text-gray-500">No orders need attention right now</p>
            </div>
          )}
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Today's Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{staffMetrics.todayCompletedOrders}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{readyOrders}</div>
              <div className="text-sm text-gray-600">Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{preparingOrders}</div>
              <div className="text-sm text-gray-600">Preparing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{pendingOrders}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
      </div>
      </DashboardLayout>
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
    </>
  );
};

export default StaffDashboard;