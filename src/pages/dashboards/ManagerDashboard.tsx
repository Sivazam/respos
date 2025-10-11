import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useLocations } from '../../contexts/LocationContext';
import { useTables } from '../../contexts/TableContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import { 
  Utensils, 
  Clock, 
  AlertCircle, 
  DollarSign,
  UserCheck,
  Table,
  MapPin
} from 'lucide-react';
import ManagerUserManagement from '../../components/manager/ManagerUserManagement';
import StartOrderButton from '../../components/order/StartOrderButton';
import TableStatusOverview from '../../components/table/TableStatusOverview';

const ManagerDashboard: React.FC = () => {
  const { orders } = useOrders();
  const { menuItems } = useMenuItems();
  const { currentLocation } = useLocations();
  const { tables } = useTables();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  
  // Get today's orders for manager's location
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
  const temporaryOrders = todaysOrders.filter(order => order.isTemporary).length;
  
  // Average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Menu item metrics
  const availableItems = menuItems.filter(item => item.isAvailable).length;
  const unavailableItems = menuItems.filter(item => !item.isAvailable).length;
  const vegetarianItems = menuItems.filter(item => item.isVegetarian).length;
  const nonVegetarianItems = menuItems.filter(item => !item.isVegetarian).length;

  // Average preparation time
  const completedOrdersWithTime = todaysOrders.filter(order => 
    order.status === 'completed' && order.completedAt
  );
  const avgPrepTime = completedOrdersWithTime.length > 0 
    ? completedOrdersWithTime.reduce((sum, order) => {
        const prepTime = new Date(order.completedAt!).getTime() - new Date(order.createdAt).getTime();
        return sum + prepTime;
      }, 0) / completedOrdersWithTime.length / (1000 * 60) // Convert to minutes
    : 0;

  // Popular items (most ordered today)
  const itemFrequency = todaysOrders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.menuItemId] = (acc[item.menuItemId] || 0) + item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  const popularItems = Object.entries(itemFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([menuItemId, count]) => {
      const item = menuItems.find(mi => mi.id === menuItemId);
      return { item: item?.name || 'Unknown', count };
    });

  // Recent orders
  const recentOrders = todaysOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <>
      <DashboardLayout title="Manager Dashboard">
        <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Welcome, Restaurant Manager</h2>
          <p className="text-gray-600">
            Manage your restaurant's daily operations, track orders, and monitor menu performance.
          </p>
        </div>

        {/* Location Filter */}
        {currentLocation && (
          <div className="bg-white shadow rounded-lg p-6">
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="bg-green-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <DollarSign className="h-6 w-6 text-green-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Revenue
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      ₹{totalRevenue.toFixed(2)}
                    </div>
                  </dd>
                  <div className="text-xs text-gray-500 mt-1">
                    Avg: ₹{avgOrderValue.toFixed(2)}/order
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <Utensils className="h-6 w-6 text-blue-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {totalOrders}
                    </div>
                  </dd>
                  <div className="text-xs text-gray-500 mt-1">
                    {completedOrders} completed
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <Table className="h-6 w-6 text-purple-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Table Status
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {occupiedTables}/{totalTables}
                    </div>
                  </dd>
                  <div className="text-xs text-gray-500 mt-1">
                    {tableOccupancyRate.toFixed(0)}% occupied
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-amber-100 rounded-md p-3">
                  <Clock className="h-6 w-6 text-amber-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Prep Time
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {Math.round(avgPrepTime)}m
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <AlertCircle className="h-6 w-6 text-red-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Orders
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {pendingOrders + preparingOrders}
                    </div>
                  </dd>
                  <div className="text-xs text-gray-500 mt-1">
                    {pendingOrders} pending, {preparingOrders} preparing
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 overflow-hidden shadow rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => setShowUserManagement(!showUserManagement)}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                  <UserCheck className="h-6 w-6 text-indigo-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Staff Management
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-lg font-semibold text-gray-900">
                      Manage Staff
                    </div>
                  </dd>
                  <div className="text-xs text-indigo-600 mt-1">
                    Click to {showUserManagement ? 'hide' : 'manage'} staff
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Management Section */}
        {showUserManagement && (
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <ManagerUserManagement onClose={() => setShowUserManagement(false)} />
            </div>
          </div>
        )}

        {/* Table Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TableStatusOverview />

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Dine In</span>
                </div>
                <span className="text-lg font-semibold">{dineInOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Takeaway</span>
                </div>
                <span className="text-lg font-semibold">{takeawayOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Temporary</span>
                </div>
                <span className="text-lg font-semibold">{temporaryOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                </div>
                <span className="text-lg font-semibold">₹{avgOrderValue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/manager/tables'}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Manage Tables
              </button>
              <button 
                onClick={() => window.location.href = '/manager/catalog'}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                View Catalog
              </button>
              <button 
                onClick={() => window.location.href = '/manager/orders'}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                View All Orders
              </button>
              <button 
                onClick={() => setShowUserManagement(true)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Staff Management
              </button>
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Pending</span>
                </div>
                <span className="text-lg font-semibold">{pendingOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Preparing</span>
                </div>
                <span className="text-lg font-semibold">{preparingOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Ready</span>
                </div>
                <span className="text-lg font-semibold">{readyOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <span className="text-lg font-semibold">{completedOrders}</span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Menu Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Available Items</span>
                </div>
                <span className="text-lg font-semibold">{availableItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Unavailable Items</span>
                </div>
                <span className="text-lg font-semibold">{unavailableItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Vegetarian</span>
                </div>
                <span className="text-lg font-semibold">{vegetarianItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">Non-Vegetarian</span>
                </div>
                <span className="text-lg font-semibold">{nonVegetarianItems}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Items */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Popular Items</h3>
          {popularItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {popularItems.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="bg-amber-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                    <span className="text-amber-800 font-bold">#{index + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{item.item}</p>
                  <p className="text-xs text-gray-500">{item.count} orders</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No orders today</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.items.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'ready' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.createdAt), 'HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No orders today</p>
          )}
        </div>
      </div>
      </DashboardLayout>
      <StartOrderButton />
    </>
  );
};

export default ManagerDashboard;