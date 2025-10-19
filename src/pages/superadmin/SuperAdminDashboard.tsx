import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  MapPin, 
  BarChart3, 
  Settings, 
  TrendingUp,
  TrendingDown,
  Store,
  Activity,
  DollarSign,
  Package,
  AlertCircle,
  RefreshCcw,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Award,
  Filter
} from 'lucide-react';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import { useSales } from '../../contexts/SalesContext';
import { useProducts } from '../../contexts/ProductContext';
import { useReturns } from '../../contexts/ReturnContext';
import { useFeatures } from '../../hooks/useFeatures';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import RegistrationDebug from '../../components/debug/RegistrationDebug';

const SuperAdminDashboard: React.FC = () => {
  const { franchises, loading } = useFranchises();
  const { locations } = useLocations();
  const { sales } = useSales();
  const { products } = useProducts();
  const { returns } = useReturns();
  const { features } = useFeatures();
  const franchise = franchises[0]; // Get first franchise if available
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate franchise-wide metrics
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalReturns = features.canProcessReturns() 
    ? returns.filter(ret => ret.type === 'sale').reduce((sum, ret) => sum + ret.total, 0)
    : 0;
  const netSales = totalSales - totalReturns;
  
  const totalTransactions = sales.length;
  const totalSalesReturns = features.canProcessReturns() 
    ? returns.filter(ret => ret.type === 'sale').length 
    : 0;
  const netTransactions = totalTransactions - totalSalesReturns;
  
  const totalItemsSold = sales.reduce((sum, sale) => 
    sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const totalItemsReturned = features.canProcessReturns()
    ? returns
        .filter(ret => ret.type === 'sale')
        .reduce((sum, ret) => 
          sum + ret.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
    : 0;
  const netItemsSold = totalItemsSold - totalItemsReturned;
  
  const lowStockItems = products.filter(product => product.quantity <= 10).length;
  const activeLocations = locations.filter(loc => loc.isActive).length;
  const activeFranchises = franchises.filter(f => f.isActive).length;

  // Calculate growth metrics (comparing to previous period)
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get previous period data for comparison
  const getPreviousPeriodData = () => {
    const now = new Date();
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 1;
    const currentStart = startOfDay(subDays(now, days));
    const currentEnd = endOfDay(now);
    const previousStart = startOfDay(subDays(currentStart, days));
    const previousEnd = endOfDay(currentStart);

    const currentSales = sales.filter(sale => 
      sale.createdAt >= currentStart && sale.createdAt <= currentEnd
    );
    const previousSales = sales.filter(sale => 
      sale.createdAt >= previousStart && sale.createdAt <= previousEnd
    );

    const currentRevenue = currentSales.reduce((sum, sale) => sum + sale.total, 0);
    const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      current: currentRevenue,
      previous: previousRevenue,
      growth: calculateGrowth(currentRevenue, previousRevenue)
    };
  };

  const revenueMetrics = getPreviousPeriodData();

  // Top performing stores
  const topStores = locations
    .map(location => {
      const locationSales = sales.filter(sale => sale.locationId === location.id);
      const locationRevenue = locationSales.reduce((sum, sale) => sum + sale.total, 0);
      const locationTransactions = locationSales.length;
      
      return {
        ...location,
        revenue: locationRevenue,
        transactions: locationTransactions,
        avgTransactionValue: locationTransactions > 0 ? locationRevenue / locationTransactions : 0
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent activities with enhanced details
  const recentActivities = [
    ...sales.map(sale => ({
      type: 'sale',
      date: sale.createdAt,
      details: `Sale #${sale.invoiceNumber} - ${sale.items.length} items, Total: ₹${sale.total.toFixed(2)}`,
      locationId: sale.locationId,
      amount: sale.total,
      status: 'completed'
    })),
    ...(features.canProcessReturns() ? returns.map(ret => ({
      type: 'return',
      date: ret.createdAt,
      details: `${ret.type === 'sale' ? 'Sales' : 'Purchase'} Return - ${ret.items.length} items, Total: ₹${ret.total.toFixed(2)}`,
      locationId: ret.locationId,
      amount: ret.total,
      status: 'processed'
    })) : [])
  ]
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 10);

  const getStoreName = (locationId: string) => {
    return locations.find(loc => loc.id === locationId)?.storeName || 'Unknown Store';
  };

  // Quick stats cards with enhanced design
  const QuickStatsCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color, 
    growth, 
    trend 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string; 
    growth?: number; 
    trend?: 'up' | 'down'; 
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">{title}</p>
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 truncate">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          {growth !== undefined && (
            <div className={`flex items-center mt-2 text-xs sm:text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
              {growth.toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-br ${color} group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-2 sm:ml-4`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Manage Franchise',
      description: franchise ? 'Update franchise settings and details' : 'Create your franchise',
      icon: Building2,
      href: '/superadmin/franchise',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'System Settings',
      description: 'Configure global system settings',
      icon: Settings,
      href: '/superadmin/settings',
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      title: 'Global Analytics',
      description: 'View comprehensive system analytics',
      icon: BarChart3,
      href: '/superadmin/analytics',
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  const franchiseActions = franchise ? [
    {
      title: 'Franchise Users',
      description: 'Manage all users in the franchise',
      icon: Users,
      href: '/franchise/users',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Locations',
      description: 'Manage franchise locations',
      icon: MapPin,
      href: '/franchise/locations',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Franchise Settings',
      description: 'Configure franchise-specific settings',
      icon: Store,
      href: '/franchise/settings',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with enhanced design */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">ForkFlow Franchise</h1>
            <p className="text-indigo-100 text-lg">Complete franchise management and oversight</p>
            <div className="flex items-center mt-4 space-x-6">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                <span className="text-indigo-100">{activeFranchises} Active Franchises</span>
              </div>
              <div className="flex items-center">
                <Store className="w-5 h-5 mr-2" />
                <span className="text-indigo-100">{activeLocations} Active Stores</span>
              </div>
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                <span className="text-indigo-100">Multi-level Management</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold mb-1">₹{netSales.toFixed(0)}</div>
            <div className="text-indigo-100">Total Net Revenue</div>
            <div className={`flex items-center justify-end mt-2 ${
              revenueMetrics.growth >= 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              {revenueMetrics.growth >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {revenueMetrics.growth.toFixed(1)}% vs last period
            </div>
          </div>
        </div>
      </div>

      {/* Period selector and search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            {['1d', '7d', '30d'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  selectedPeriod === period
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {period === '1d' ? 'Today' : period === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search franchises, stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <QuickStatsCard
          title={features.canProcessReturns() ? 'Net Revenue' : 'Total Revenue'}
          value={`₹${netSales.toFixed(0)}`}
          subtitle={features.canProcessReturns() ? `Gross: ₹${totalSales.toFixed(0)} | Returns: ₹${totalReturns.toFixed(0)}` : undefined}
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
          growth={revenueMetrics.growth}
          trend={revenueMetrics.growth >= 0 ? 'up' : 'down'}
        />
        
        <QuickStatsCard
          title={features.canProcessReturns() ? 'Net Transactions' : 'Total Transactions'}
          value={netTransactions}
          subtitle={features.canProcessReturns() ? `Sales: ${totalTransactions} | Returns: ${totalSalesReturns}` : undefined}
          icon={ShoppingCart}
          color="from-blue-500 to-cyan-600"
        />
        
        <QuickStatsCard
          title={features.canProcessReturns() ? 'Net Items Sold' : 'Total Items Sold'}
          value={netItemsSold}
          subtitle={features.canProcessReturns() ? `Sold: ${totalItemsSold} | Returned: ${totalItemsReturned}` : undefined}
          icon={Package}
          color="from-purple-500 to-pink-600"
        />
        
        <QuickStatsCard
          title="Low Stock Alerts"
          value={lowStockItems}
          subtitle="Across all locations"
          icon={AlertCircle}
          color="from-amber-500 to-orange-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className={`${action.color} text-white p-6 rounded-lg transition-colors duration-200 block`}
            >
              <action.icon className="h-8 w-8 mb-3" />
              <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
              <p className="text-sm opacity-90">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Performing Stores and Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-500" />
              Top Performing Stores
            </h3>
            <button className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {topStores.map((location, index) => (
              <div key={location.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{location.storeName}</h4>
                    <p className="text-xs sm:text-sm text-gray-500">{location.transactions} transactions</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">₹{location.revenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Avg: ₹{location.avgTransactionValue.toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-500" />
              Recent Activity
            </h3>
            <button className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-96 overflow-y-auto">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                  activity.type === 'sale' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {activity.type === 'sale' ? (
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  ) : (
                    <RefreshCcw className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-900 font-medium truncate">{activity.details}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getStoreName(activity.locationId)} • {format(activity.date, 'MMM dd, HH:mm')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">₹{activity.amount.toFixed(0)}</p>
                  <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Franchise Management */}
      {franchise && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Franchise Management</h2>
            <div className="text-sm text-gray-600">
              Franchise: <span className="font-medium">{franchise.name}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {franchiseActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className={`${action.color} text-white p-6 rounded-lg transition-colors duration-200 block`}
              >
                <action.icon className="h-8 w-8 mb-3" />
                <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Franchise Notice */}
      {!franchise && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">No Franchise Created</h3>
              <p className="text-yellow-700 mt-1">
                You need to create a franchise to start managing the system. Click on "Manage Franchise" to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration Debug */}
      <RegistrationDebug />
    </div>
  );
};

export default SuperAdminDashboard;