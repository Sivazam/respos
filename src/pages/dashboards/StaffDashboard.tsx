import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useLocations } from '../../contexts/LocationContext';
import { useTables } from '../../contexts/TableContext';
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

const StaffDashboard: React.FC = () => {
  const { orders, updateOrderStatus } = useOrders();
  const { menuItems } = useMenuItems();
  const { currentLocation } = useLocations();
  const { tables } = useTables();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  
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
  const preparingOrders = todaysOrders.filter(order => order.status === 'preparing').length;
  const readyOrders = todaysOrders.filter(order => order.status === 'ready').length;
  const completedOrders = todaysOrders.filter(order => order.status === 'completed').length;
  
  // Table-specific metrics
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;
  const totalTables = tables.length;
  const tableOccupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;
  
  // Order type breakdown
  const dineInOrders = todaysOrders.filter(order => order.orderType === 'dine_in').length;
  const takeawayOrders = todaysOrders.filter(order => order.orderType === 'takeaway').length;
  
  // Average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Orders that need attention (pending and preparing)
  const ordersNeedingAttention = todaysOrders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
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

  return (
    <>
      <DashboardLayout title="Staff Dashboard">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
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
                  {pendingOrders} pending
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
              <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
                <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate">
                  Order Types
                </h3>
                <p className="text-lg sm:text-2xl font-semibold text-orange-600">
                  {dineInOrders}/{takeawayOrders}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Dine/Take
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
                        {order.tableNumber && ` • Table ${order.tableNumber}`}
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
            <p className="text-gray-500 text-center py-4 text-sm sm:text-base">
              No orders need attention right now
            </p>
          )}
        </div>

        {/* Table Status Overview */}
        <TableStatusOverview />

        {/* Quick Menu Lookup */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Quick Menu Lookup</h2>
          <div className="space-y-4">
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />

            {searchTerm && (
              <div className="mt-4">
                {filteredMenuItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMenuItems.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/48?text=Menu';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Utensils className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                            <p className="text-xs text-gray-500 truncate mb-1">{item.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-green-600">
                                ₹{item.price.toFixed(2)}
                              </span>
                              <div className="flex items-center space-x-2">
                                {item.isVegetarian ? (
                                  <span className="text-xs text-green-600">🌿 Veg</span>
                                ) : (
                                  <span className="text-xs text-red-600">🍗 Non-Veg</span>
                                )}
                                <span className={`text-xs px-2 py-1 rounded ${
                                  item.spiceLevel === 'mild' ? 'bg-green-100 text-green-800' :
                                  item.spiceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  item.spiceLevel === 'hot' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.spiceLevel}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center mt-1">
                              <Clock className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500">{item.preparationTime} min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4 text-sm sm:text-base">
                    No menu items found
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Today's Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
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
      <StartOrderButton />
    </>
  );
};

export default StaffDashboard;