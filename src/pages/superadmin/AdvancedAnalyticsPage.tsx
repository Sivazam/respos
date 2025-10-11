import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useProducts } from '../../contexts/ProductContext';
import { useLocations } from '../../contexts/LocationContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useReturns } from '../../contexts/ReturnContext';
import { useFeatures } from '../../hooks/useFeatures';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  isWithinInterval,
  parseISO
} from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Store,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Award,
  Globe,
  Activity,
  Eye,
  Settings,
  ChevronUp,
  ChevronDown,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AnalyticsData {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  growth: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
  };
}

interface LocationPerformance {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
  growth: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  revenue: number;
  quantity: number;
  growth: number;
  stockLevel: number;
}

const AdvancedAnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales } = useSales();
  const { products } = useProducts();
  const { locations } = useLocations();
  const { franchises } = useFranchises();
  const { returns } = useReturns();
  const { features } = useFeatures();
  
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'locations']));

  // Date range calculations
  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;
    
    switch (selectedPeriod) {
      case '7d':
        start = startOfDay(subDays(now, 7));
        end = endOfDay(now);
        break;
      case '30d':
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
        break;
      case '90d':
        start = startOfDay(subDays(now, 90));
        end = endOfDay(now);
        break;
      case '1y':
        start = startOfDay(subDays(now, 365));
        end = endOfDay(now);
        break;
      default:
        start = startOfDay(subDays(now, 30));
        end = endOfDay(now);
    }
    
    return { start, end };
  };

  const { start: currentStart, end: currentEnd } = getDateRange();
  const previousStart = startOfDay(subDays(currentStart, parseInt(selectedPeriod) || 30));
  const previousEnd = endOfDay(currentStart);

  // Filter data by date range
  const currentPeriodSales = useMemo(() => 
    sales.filter(sale => isWithinInterval(sale.createdAt, { start: currentStart, end: currentEnd })),
    [sales, currentStart, currentEnd]
  );

  const previousPeriodSales = useMemo(() => 
    sales.filter(sale => isWithinInterval(sale.createdAt, { start: previousStart, end: previousEnd })),
    [sales, previousStart, previousEnd]
  );

  // Calculate analytics data
  const analyticsData: AnalyticsData = useMemo(() => {
    const currentRevenue = currentPeriodSales.reduce((sum, sale) => sum + sale.total, 0);
    const previousRevenue = previousPeriodSales.reduce((sum, sale) => sum + sale.total, 0);
    
    const currentOrders = currentPeriodSales.length;
    const previousOrders = previousPeriodSales.length;
    
    const currentCustomers = new Set(currentPeriodSales.map(sale => sale.customerId || sale.id)).size;
    const previousCustomers = new Set(previousPeriodSales.map(sale => sale.customerId || sale.id)).size;
    
    const currentProducts = new Set(currentPeriodSales.flatMap(sale => sale.items.map(item => item.productId))).size;
    const previousProducts = new Set(previousPeriodSales.flatMap(sale => sale.items.map(item => item.productId))).size;

    return {
      revenue: currentRevenue,
      orders: currentOrders,
      customers: currentCustomers,
      products: currentProducts,
      growth: {
        revenue: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
        orders: previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0,
        customers: previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0,
        products: previousProducts > 0 ? ((currentProducts - previousProducts) / previousProducts) * 100 : 0,
      }
    };
  }, [currentPeriodSales, previousPeriodSales]);

  // Location performance
  const locationPerformance: LocationPerformance[] = useMemo(() => 
    locations.map(location => {
      const locationSales = currentPeriodSales.filter(sale => sale.locationId === location.id);
      const previousLocationSales = previousPeriodSales.filter(sale => sale.locationId === location.id);
      
      const currentRevenue = locationSales.reduce((sum, sale) => sum + sale.total, 0);
      const previousRevenue = previousLocationSales.reduce((sum, sale) => sum + sale.total, 0);
      
      const customers = new Set(locationSales.map(sale => sale.customerId || sale.id)).size;
      const avgOrderValue = locationSales.length > 0 ? currentRevenue / locationSales.length : 0;
      
      return {
        id: location.id,
        name: location.storeName,
        revenue: currentRevenue,
        orders: locationSales.length,
        customers,
        avgOrderValue,
        growth: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
      };
    }).sort((a, b) => b.revenue - a.revenue),
    [locations, currentPeriodSales, previousPeriodSales]
  );

  // Product performance
  const productPerformance: ProductPerformance[] = useMemo(() => {
    const productMap = new Map<string, ProductPerformance>();
    
    currentPeriodSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId) || {
          id: item.productId,
          name: item.name,
          category: item.category || 'Uncategorized',
          revenue: 0,
          quantity: 0,
          growth: 0,
          stockLevel: 0
        };
        
        existing.revenue += item.price * item.quantity;
        existing.quantity += item.quantity;
        
        productMap.set(item.productId, existing);
      });
    });
    
    // Add stock levels
    products.forEach(product => {
      const perf = productMap.get(product.id);
      if (perf) {
        perf.stockLevel = product.quantity;
      }
    });
    
    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [currentPeriodSales, products]);

  // Daily revenue data for chart
  const dailyRevenueData = useMemo(() => {
    const days = eachDayOfInterval({ start: currentStart, end: currentEnd });
    return days.map(day => {
      const daySales = currentPeriodSales.filter(sale => 
        format(sale.createdAt, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      return {
        date: format(day, 'MMM dd'),
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
        orders: daySales.length
      };
    });
  }, [currentPeriodSales, currentStart, currentEnd]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Export data
  const exportData = () => {
    const data = {
      period: selectedPeriod,
      generated: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      analytics: analyticsData,
      locations: locationPerformance,
      products: productPerformance,
      dailyRevenue: dailyRevenueData
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forkflow-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MetricCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    color, 
    format: formatValue = (v: any) => v.toString() 
  }: { 
    title: string; 
    value: any; 
    growth: number; 
    icon: any; 
    color: string; 
    format?: (value: any) => string; 
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center text-sm font-medium ${
          growth >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {growth >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {Math.abs(growth).toFixed(1)}%
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{formatValue(value)}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );

  return (
    <DashboardLayout title="Advanced Analytics">
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Advanced Analytics</h1>
              <p className="text-gray-600">Comprehensive insights and performance metrics</p>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center bg-gray-50 rounded-lg p-1">
                {['7d', '30d', '90d', '1y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      selectedPeriod === period
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsLoading(!isLoading)}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={exportData}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={analyticsData.revenue}
            growth={analyticsData.growth.revenue}
            icon={DollarSign}
            color="from-green-500 to-emerald-600"
            format={(v) => `₹${v.toFixed(0)}`}
          />
          <MetricCard
            title="Total Orders"
            value={analyticsData.orders}
            growth={analyticsData.growth.orders}
            icon={ShoppingCart}
            color="from-blue-500 to-cyan-600"
          />
          <MetricCard
            title="Unique Customers"
            value={analyticsData.customers}
            growth={analyticsData.growth.customers}
            icon={Users}
            color="from-purple-500 to-pink-600"
          />
          <MetricCard
            title="Products Sold"
            value={analyticsData.products}
            growth={analyticsData.growth.products}
            icon={Package}
            color="from-amber-500 to-orange-600"
          />
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
              Revenue Trend
            </h2>
            <button
              onClick={() => toggleSection('revenue-chart')}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              {expandedSections.has('revenue-chart') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.has('revenue-chart') && (
            <div className="space-y-4">
              <div className="h-64 flex items-end space-x-2">
                {dailyRevenueData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg hover:from-indigo-600 hover:to-indigo-500 transition-colors duration-200 relative group"
                      style={{ 
                        height: `${Math.max((day.revenue / Math.max(...dailyRevenueData.map(d => d.revenue))) * 100, 5)}%` 
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        ₹{day.revenue.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {day.date.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Daily Revenue</span>
                <span>Total: ₹{dailyRevenueData.reduce((sum, day) => sum + day.revenue, 0).toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Location Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Store className="w-5 h-5 mr-2 text-indigo-500" />
              Location Performance
            </h2>
            <button
              onClick={() => toggleSection('locations')}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              {expandedSections.has('locations') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.has('locations') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {locationPerformance.slice(0, 6).map((location) => (
                  <div key={location.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{location.name}</h3>
                      <span className={`text-sm font-medium ${
                        location.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {location.growth >= 0 ? '+' : ''}{location.growth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Revenue</p>
                        <p className="font-semibold text-gray-900">₹{location.revenue.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Orders</p>
                        <p className="font-semibold text-gray-900">{location.orders}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Customers</p>
                        <p className="font-semibold text-gray-900">{location.customers}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Order</p>
                        <p className="font-semibold text-gray-900">₹{location.avgOrderValue.toFixed(0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="w-5 h-5 mr-2 text-indigo-500" />
              Top Products
            </h2>
            <button
              onClick={() => toggleSection('products')}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              {expandedSections.has('products') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.has('products') && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Product</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-900">Category</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-900">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-900">Quantity</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-900">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{product.category}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          ₹{product.revenue.toFixed(0)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">{product.quantity}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            product.stockLevel <= 10 
                              ? 'bg-red-100 text-red-800' 
                              : product.stockLevel <= 25 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stockLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Insights and Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-500" />
              Insights & Recommendations
            </h2>
            <button
              onClick={() => toggleSection('insights')}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors duration-200"
            >
              {expandedSections.has('insights') ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {expandedSections.has('insights') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-medium text-green-900">Strong Performance</h3>
                </div>
                <p className="text-sm text-green-800">
                  Revenue has grown by {analyticsData.growth.revenue.toFixed(1)}% compared to the previous period. 
                  Top performing location: {locationPerformance[0]?.name || 'N/A'}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Info className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-blue-900">Customer Insights</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Average order value: ₹{analyticsData.orders > 0 ? (analyticsData.revenue / analyticsData.orders).toFixed(0) : '0'}. 
                  {analyticsData.growth.customers > 0 ? ' Customer base is expanding.' : ' Focus on customer retention.'}
                </p>
              </div>
              
              {productPerformance.filter(p => p.stockLevel <= 10).length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <h3 className="font-medium text-yellow-900">Inventory Alert</h3>
                  </div>
                  <p className="text-sm text-yellow-800">
                    {productPerformance.filter(p => p.stockLevel <= 10).length} products are running low on stock. 
                    Consider restocking soon.
                  </p>
                </div>
              )}
              
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-purple-900">Growth Opportunity</h3>
                </div>
                <p className="text-sm text-purple-800">
                  Focus on top-performing products and consider expanding to new locations 
                  to maintain growth momentum.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdvancedAnalyticsPage;