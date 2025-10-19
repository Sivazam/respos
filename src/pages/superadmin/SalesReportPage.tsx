import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { BarChart, FileText, Download, Calendar, Calculator, Building, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import { useFeatures } from '../../hooks/useFeatures';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV } from '../../utils/csvExport';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SuperAdminSalesReportPage: React.FC = () => {
  const { orders, loading, error } = useOrders();
  const { franchises } = useFranchises();
  const { locations } = useLocations();
  const { features } = useFeatures();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('all');

  const dateRanges = [
    {
      label: 'Today',
      getRange: () => ({
        start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        end: format(endOfDay(new Date()), 'yyyy-MM-dd')
      })
    },
    {
      label: 'Last 7 Days',
      getRange: () => ({
        start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Week',
      getRange: () => ({
        start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Month',
      getRange: () => ({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Year',
      getRange: () => ({
        start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
        end: format(endOfYear(new Date()), 'yyyy-MM-dd')
      })
    }
  ];

  // Get franchise locations for filtering
  const franchiseLocations = useMemo(() => {
    if (selectedFranchiseId === 'all') return locations;
    return locations.filter(location => location.franchiseId === selectedFranchiseId);
  }, [selectedFranchiseId, locations]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.createdAt;
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Filter by franchise if specified
      const matchesFranchise = selectedFranchiseId === 'all' || 
        franchiseLocations.some(location => location.id === order.locationId);
      
      // Only include settled orders for revenue calculations
      return order.status === 'settled' && orderDate >= start && orderDate <= end && matchesFranchise;
    });
  }, [orders, startDate, endDate, selectedFranchiseId, franchiseLocations]);

  const summary = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
    const totalOrders = filteredOrders.length;
    
    // Payment method breakdown
    const upiOrders = filteredOrders.filter(order => order.paymentMethod === 'upi');
    const cashOrders = filteredOrders.filter(order => order.paymentMethod === 'cash');
    const cardOrders = filteredOrders.filter(order => order.paymentMethod === 'card');
    
    const upiRevenue = upiOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
    const cashRevenue = cashOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
    const cardRevenue = cardOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
    
    // Order type breakdown
    const dineInOrders = filteredOrders.filter(order => order.orderType === 'dinein');
    const deliveryOrders = filteredOrders.filter(order => order.orderType === 'delivery');
    
    // Calculate total items sold
    const totalItems = filteredOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Franchise breakdown
    const franchiseBreakdown = franchises.map(franchise => {
      const franchiseOrders = filteredOrders.filter(order => {
        const location = locations.find(loc => loc.id === order.locationId);
        return location?.franchiseId === franchise.id;
      });
      
      const franchiseRevenue = franchiseOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0);
      const franchiseOrderCount = franchiseOrders.length;
      
      return {
        franchiseId: franchise.id,
        franchiseName: franchise.name,
        revenue: franchiseRevenue,
        orderCount: franchiseOrderCount,
        avgOrderValue: franchiseOrderCount > 0 ? franchiseRevenue / franchiseOrderCount : 0
      };
    }).filter(franchise => franchise.orderCount > 0);

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      avgOrderValue,
      paymentBreakdown: {
        upi: { revenue: upiRevenue, count: upiOrders.length },
        cash: { revenue: cashRevenue, count: cashOrders.length },
        card: { revenue: cardRevenue, count: cardOrders.length }
      },
      orderTypeBreakdown: {
        dinein: { revenue: dineInOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0), count: dineInOrders.length },
        delivery: { revenue: deliveryOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0), count: deliveryOrders.length }
      },
      franchiseBreakdown
    };
  }, [filteredOrders, features, franchises, locations]);

  // Chart data preparation
  const paymentChartData = useMemo(() => ({
    labels: ['UPI', 'Cash', 'Card'],
    datasets: [{
      label: 'Revenue by Payment Method',
      data: [
        summary.paymentBreakdown.upi.revenue,
        summary.paymentBreakdown.cash.revenue,
        summary.paymentBreakdown.card.revenue
      ],
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
      borderColor: ['#059669', '#2563eb', '#d97706'],
      borderWidth: 1
    }]
  }), [summary]);

  const orderTypeChartData = useMemo(() => ({
    labels: ['Dine-in', 'Delivery'],
    datasets: [{
      label: 'Orders by Type',
      data: [
        summary.orderTypeBreakdown.dinein.count,
        summary.orderTypeBreakdown.delivery.count
      ],
      backgroundColor: ['#8b5cf6', '#ef4444'],
      borderColor: ['#7c3aed', '#dc2626'],
      borderWidth: 1
    }]
  }), [summary]);

  const franchiseChartData = useMemo(() => ({
    labels: summary.franchiseBreakdown.map(f => f.franchiseName),
    datasets: [{
      label: 'Revenue by Franchise',
      data: summary.franchiseBreakdown.map(f => f.revenue),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      borderColor: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777'],
      borderWidth: 1
    }]
  }), [summary]);

  // Prepare data for daily sales chart
  const dailySalesData = useMemo(() => {
    const dailyTotals = filteredOrders.reduce((acc, order) => {
      const date = format(order.createdAt, 'yyyy-MM-dd');
      acc[date] = (acc[date] || 0) + (order.total || order.totalAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(dailyTotals),
      datasets: [{
        label: 'Daily Revenue',
        data: Object.values(dailyTotals),
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }]
    };
  }, [filteredOrders]);

  const handleDateRangeSelect = (range: { start: string; end: string }) => {
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const downloadReport = () => {
    const headers = ['Date', 'Order #', 'Type', 'Items', 'Payment Method', 'Amount', 'Franchise', 'Location'];
    
    // Create order data for the report
    const orderData = filteredOrders.map(order => {
      const location = locations.find(loc => loc.id === order.locationId);
      const franchise = franchises.find(f => f.id === location?.franchiseId);
      
      return [
        formatDateForCSV(order.createdAt),
        order.orderNumber || 'Unknown',
        order.orderType === 'dinein' ? 'Dine-in' : 'Delivery',
        order.items.reduce((sum, item) => sum + item.quantity, 0),
        (order.paymentMethod || 'CASH').toUpperCase(),
        formatCurrencyForCSV(order.total || order.totalAmount || 0),
        franchise?.name || 'Unknown',
        location?.name || 'Unknown'
      ];
    }).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', '', '', ''],
      ['SUMMARY', '', '', '', '', '', '', ''],
      ['Total Orders', '', '', summary.totalOrders.toString(), '', formatCurrencyForCSV(summary.totalRevenue), '', ''],
      ['Average Order Value', '', '', '', '', formatCurrencyForCSV(summary.avgOrderValue), '', ''],
      ['Total Items Sold', '', '', summary.totalItems.toString(), '', '', '', ''],
      ['', 'PAYMENT BREAKDOWN', '', '', '', '', '', ''],
      ['UPI Payments', '', '', summary.paymentBreakdown.upi.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.upi.revenue), '', ''],
      ['Cash Payments', '', '', summary.paymentBreakdown.cash.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.cash.revenue), '', ''],
      ['Card Payments', '', '', summary.paymentBreakdown.card.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.card.revenue), '', ''],
      ['', 'FRANCHISE BREAKDOWN', '', '', '', '', '', ''],
      ...summary.franchiseBreakdown.map(franchise => [
        franchise.franchiseName, '', '', franchise.orderCount.toString(), '', formatCurrencyForCSV(franchise.revenue), '', ''
      ])
    ];

    const csvData = [headers, ...orderData, ...summaryRows];
    
    downloadCSV(csvData, `franchise-sales-report-${startDate}-to-${endDate}.csv`);
  };

  return (
    <DashboardLayout title="Franchise Sales Report">
      <div className="space-y-4 sm:space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Date Range Selection */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {dateRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleDateRangeSelect(range.getRange())}
                  className="px-3 py-2 rounded-full text-xs sm:text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={<Calendar size={18} className="text-gray-500" />}
              />
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                icon={<Calendar size={18} className="text-gray-500" />}
              />
            </div>

            {/* Franchise Filter */}
            <div className="flex items-center gap-2">
              <Building size={18} className="text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Franchise:</label>
              <select
                value={selectedFranchiseId}
                onChange={(e) => setSelectedFranchiseId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Franchises</option>
                {franchises.map(franchise => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-2">
              <Button
                variant="primary"
                onClick={downloadReport}
                disabled={loading || filteredOrders.length === 0}
                className="w-full sm:w-auto"
              >
                <Download size={18} className="mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  ₹{summary.totalRevenue.toFixed(2)}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  From {summary.totalOrders} orders
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Orders
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {summary.totalOrders}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Avg: ₹{summary.avgOrderValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Items Sold
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {summary.totalItems}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Across all orders
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Avg Order Value
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  ₹{summary.avgOrderValue.toFixed(2)}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Per order average
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Daily Revenue
            </h3>
            <div className="h-64 sm:h-80">
              <Bar
                data={dailySalesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${value}`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Revenue by Franchise
            </h3>
            <div className="h-64 sm:h-80">
              <Bar
                data={franchiseChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${value}`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Payment Methods
            </h3>
            <div className="h-64 sm:h-80">
              <Pie
                data={paymentChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Order Types
            </h3>
            <div className="h-64 sm:h-80">
              <Pie
                data={orderTypeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Franchise Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Franchise Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : summary.franchiseBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      No franchise data found for the selected date range
                    </td>
                  </tr>
                ) : (
                  summary.franchiseBreakdown
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(franchise => (
                      <tr key={franchise.franchiseId}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {franchise.franchiseName}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {franchise.orderCount}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{franchise.revenue.toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{franchise.avgOrderValue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      No orders found for the selected date range
                    </td>
                  </tr>
                ) : (
                  filteredOrders
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .slice(0, 50) // Show last 50 orders
                    .map(order => {
                      const location = locations.find(loc => loc.id === order.locationId);
                      const franchise = franchises.find(f => f.id === location?.franchiseId);
                      
                      return (
                        <tr key={order.id}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <span className="hidden sm:inline">{format(order.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                            <span className="sm:hidden">{format(order.createdAt, 'dd/MM HH:mm')}</span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.orderType === 'dinein' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.paymentMethod === 'upi' 
                                ? 'bg-green-100 text-green-800'
                                : order.paymentMethod === 'card'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {(order.paymentMethod || 'cash').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {franchise?.name || 'Unknown'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            ₹{(order.total || order.totalAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminSalesReportPage;