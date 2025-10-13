import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { BarChart, FileText, Download, Calendar, Calculator, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useLocations } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SalesReportPage: React.FC = () => {
  const { orders, loading, error } = useOrders();
  const { locations } = useLocations();
  const { currentUser } = useAuth();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = order.createdAt;
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      // Filter by location if specified (for admins)
      const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
      
      // Only include settled orders for revenue calculations
      return order.status === 'settled' && orderDate >= start && orderDate <= end && matchesLocation;
    });
  }, [orders, startDate, endDate, selectedLocationId]);

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
      }
    };
  }, [filteredOrders]);

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

  // Check if user is admin (for location filtering)
  const isAdmin = currentUser?.role === 'admin';
  const hasMultipleLocations = locations.length > 1;

  const downloadReport = () => {
    const headers = ['Date', 'Order #', 'Type', 'Items', 'Payment Method', 'Amount'];
    
    // Create order data for the report
    const orderData = filteredOrders.map(order => [
      format(order.createdAt, 'dd/MM/yyyy HH:mm'),
      order.orderNumber,
      order.orderType === 'dinein' ? 'Dine-in' : 'Delivery',
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      (order.paymentMethod || 'CASH').toUpperCase(),
      `₹${(order.total || order.totalAmount || 0).toFixed(2)}`
    ]).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', ''],
      ['SUMMARY', '', '', '', '', ''],
      ['Total Orders', '', '', summary.totalOrders, '', `₹${summary.totalRevenue.toFixed(2)}`],
      ['Average Order Value', '', '', '', '', `₹${summary.avgOrderValue.toFixed(2)}`],
      ['Total Items Sold', '', '', summary.totalItems, '', ''],
      ['', 'PAYMENT BREAKDOWN', '', '', '', ''],
      ['UPI Payments', '', '', summary.paymentBreakdown.upi.count, '', `₹${summary.paymentBreakdown.upi.revenue.toFixed(2)}`],
      ['Cash Payments', '', '', summary.paymentBreakdown.cash.count, '', `₹${summary.paymentBreakdown.cash.revenue.toFixed(2)}`],
      ['Card Payments', '', '', summary.paymentBreakdown.card.count, '', `₹${summary.paymentBreakdown.card.revenue.toFixed(2)}`]
    ];

    const csv = [
      headers.join(','),
      ...orderData.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };


  return (
    <DashboardLayout title="Sales Report">
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

            {/* Location Filter for Admins */}
            {isAdmin && hasMultipleLocations && (
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Location:</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Locations</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed;
                          return `${label}: ₹${value.toFixed(2)}`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      No orders found for the selected date range
                    </td>
                  </tr>
                ) : (
                  filteredOrders
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map(order => (
                      <tr key={order.id}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <span className="hidden sm:inline">{format(order.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                          <span className="sm:hidden">{format(order.createdAt, 'dd/MM HH:mm')}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            order.orderType === 'dinein'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {order.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          <span className="hidden sm:inline">
                            {order.orderNumber}
                          </span>
                          <span className="sm:hidden">
                            {order.orderNumber?.slice(-4)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <span className="hidden sm:inline">
                            {(order.paymentMethod || 'CASH').toUpperCase()}
                          </span>
                          <span className="sm:hidden">
                            {(order.paymentMethod || 'CASH').toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium ${
                          order.total > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{(order.total || order.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalesReportPage;