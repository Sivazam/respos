import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { BarChart, FileText, Download, Calendar, Calculator, TrendingUp, Filter } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useLocations } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/db';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV } from '../../utils/csvExport';

// Type definitions
interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: OrderItem[];
  totalAmount: number;
  total?: number;
  status: string;
  orderType: 'dinein' | 'delivery';
  orderMode?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  completedAt?: Date | string;
  settledAt?: Date | string;
  staffId?: string;
  paymentMethod: 'upi' | 'cash' | 'card';
  paymentData?: Record<string, unknown>;
  customerName?: string;
  notes?: string;
  locationId: string;
}

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SalesReportPage: React.FC = () => {
  const { locations } = useLocations();
  const { currentUser } = useAuth();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comprehensive order data (same approach as ManagerDashboard)
  React.useEffect(() => {
    const loadOrders = async () => {
      if (!currentUser) {
        console.log('No current user, skipping order loading');
        return;
      }

      try {
        setLoading(true);
        
        // Source 1: Load from localStorage (user-specific)
        const completedOrdersKey = `completed_orders_${currentUser?.uid}`;
        const existingOrders = JSON.parse(localStorage.getItem(completedOrdersKey) || '[]');
        
        // Source 2: Load location-based completed orders
        const locationCompletedOrdersKey = `completed_orders_${currentUser?.locationId}`;
        const locationOrders = JSON.parse(localStorage.getItem(locationCompletedOrdersKey) || '[]');
        
        // Source 3: Load admin completed orders
        const adminCompletedOrdersKey = `completed_orders_admin`;
        const adminOrders = JSON.parse(localStorage.getItem(adminCompletedOrdersKey) || '[]');
        
        // Source 4: Load owner completed orders
        const ownerCompletedOrdersKey = `completed_orders_owner`;
        const ownerOrders = JSON.parse(localStorage.getItem(ownerCompletedOrdersKey) || '[]');
        
        // Source 5: Load from sales localStorage
        const salesKey = `sales_${currentUser?.locationId || 'default'}`;
        const salesOrders = JSON.parse(localStorage.getItem(salesKey) || '[]');
        
        // Source 6: Load from general sales
        const generalSalesKey = 'sales';
        const generalSales = JSON.parse(localStorage.getItem(generalSalesKey) || '[]');
        
        // Source 7: Load from Firestore
        let firestoreOrders: Order[] = [];
        if (currentUser?.locationId && currentUser?.uid) {
          try {
            const ordersQuery = query(
              collection(db, 'orders'),
              where('locationId', '==', currentUser.locationId)
            );
            
            const querySnapshot = await getDocs(ordersQuery);
            firestoreOrders = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                orderNumber: data.orderNumber,
                tableIds: data.tableIds || [],
                tableNames: data.tableNames || [],
                items: data.items || [],
                totalAmount: data.totalAmount || data.total || 0,
                status: data.status,
                orderType: data.orderType || 'dinein',
                orderMode: data.orderMode,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                completedAt: data.completedAt?.toDate?.() || data.completedAt,
                settledAt: data.settledAt?.toDate?.() || data.settledAt || data.completedAt?.toDate?.() || data.completedAt,
                staffId: data.staffId,
                paymentMethod: data.paymentData?.paymentMethod || data.paymentMethod || 'cash',
                paymentData: data.paymentData,
                customerName: data.customerName,
                notes: data.notes,
                locationId: data.locationId
              };
            }).filter(order => order.status === 'completed');
          } catch (firestoreError) {
            console.error('Error loading from Firestore:', firestoreError);
            // Continue without Firestore data if there's an error
          }
        }
        
        // Combine all sources
        const combinedOrders = [
          ...existingOrders,
          ...locationOrders, 
          ...adminOrders, 
          ...ownerOrders,
          ...salesOrders.map(sale => ({
            id: sale.id,
            orderNumber: sale.invoiceNumber,
            tableIds: sale.tableNames || [],
            tableNames: sale.tableNames || [],
            items: sale.items || [],
            totalAmount: sale.total || 0,
            status: 'settled',
            orderType: sale.orderType || 'dinein',
            orderMode: sale.orderMode,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            settledAt: sale.createdAt,
            staffId: sale.staffId,
            paymentMethod: sale.paymentMethod || 'cash',
            locationId: sale.locationId
          })),
          ...generalSales.map(sale => ({
            id: sale.id,
            orderNumber: sale.invoiceNumber,
            tableIds: sale.tableNames || [],
            tableNames: sale.tableNames || [],
            items: sale.items || [],
            totalAmount: sale.total || 0,
            status: 'settled',
            orderType: sale.orderType || 'dinein',
            orderMode: sale.orderMode,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            settledAt: sale.createdAt,
            staffId: sale.staffId,
            paymentMethod: sale.paymentMethod || 'cash',
            locationId: sale.locationId
          })),
          ...firestoreOrders
        ];
        
        // Remove duplicates
        const uniqueOrders = combinedOrders.filter((order, index, self) => 
          index === self.findIndex((o) => o.id === order.id)
        );
        
        console.log(`Loaded ${uniqueOrders.length} unique orders for sales report`);
        
        // Debug: Log first few orders to understand their structure
        if (uniqueOrders.length > 0) {
          console.log('📊 Sample order data:', uniqueOrders.slice(0, 3).map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            completedAt: order.completedAt,
            settledAt: order.settledAt,
            createdAt: order.createdAt,
            totalAmount: order.totalAmount || order.total,
            locationId: order.locationId
          })));
        }
        
        setCompletedOrders(uniqueOrders);
      } catch (error) {
        console.error('Failed to load completed orders:', error);
        setError('Failed to load orders data');
      } finally {
        setLoading(false);
      }
    };
    
    loadOrders();
  }, [currentUser?.uid, currentUser?.locationId]);

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
    console.log('🔍 Filtering orders:', {
      totalOrders: completedOrders.length,
      startDate,
      endDate,
      selectedLocationId
    });

    const filtered = completedOrders.filter(order => {
      try {
        // Use completedAt or settledAt for date filtering, fallback to createdAt
        const orderDate = new Date(order.completedAt || order.settledAt || order.createdAt);
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        
        // Check if the date is valid
        if (isNaN(orderDate.getTime())) {
          console.warn('Invalid date for order:', order.id, order.completedAt || order.settledAt || order.createdAt);
          return false;
        }
        
        // Filter by location if specified (for admins)
        const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
        
        // Check order status - only include "completed" orders as per requirement
        const hasCompletedStatus = order.status === 'completed';
        
        // Check date range
        const inDateRange = orderDate >= start && orderDate <= end;
        
        console.log(`📋 Order ${order.id}:`, {
          status: order.status,
          completedAt: order.completedAt,
          settledAt: order.settledAt,
          createdAt: order.createdAt,
          orderDate: orderDate.toISOString(),
          hasCompletedStatus,
          matchesLocation,
          inDateRange,
          willPass: hasCompletedStatus && inDateRange && matchesLocation
        });
        
        // Only include completed orders for revenue calculations
        return hasCompletedStatus && inDateRange && matchesLocation;
      } catch (error) {
        console.warn('Error filtering order:', order.id, error);
        return false;
      }
    });

    console.log(`✅ Filtered ${filtered.length} orders from ${completedOrders.length} total orders`);
    return filtered;
  }, [completedOrders, startDate, endDate, selectedLocationId]);

  const summary = useMemo(() => {
    console.log('🧮 Calculating summary from filtered orders:', filteredOrders.length);
    
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    
    console.log('💰 Revenue calculation:', {
      totalRevenue,
      totalOrders,
      ordersWithAmounts: filteredOrders.map(o => ({
        id: o.id,
        amount: o.totalAmount || o.total
      }))
    });
    
    // Payment method breakdown
    const upiOrders = filteredOrders.filter(order => order.paymentMethod === 'upi');
    const cashOrders = filteredOrders.filter(order => order.paymentMethod === 'cash');
    const cardOrders = filteredOrders.filter(order => order.paymentMethod === 'card');
    
    const upiRevenue = upiOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
    const cashRevenue = cashOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
    const cardRevenue = cardOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
    
    // Order type breakdown
    const dineInOrders = filteredOrders.filter(order => order.orderType === 'dinein');
    const deliveryOrders = filteredOrders.filter(order => order.orderType === 'delivery');
    
    // Calculate total items sold
    const totalItems = filteredOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum: number, item: OrderItem) => itemSum + (item.quantity || 1), 0), 0);
    
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
        dinein: { revenue: dineInOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0), count: dineInOrders.length },
        delivery: { revenue: deliveryOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0), count: deliveryOrders.length }
      }
    };
  }, [filteredOrders, currentUser?.locationId]);

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
      try {
        // Use completedAt or settledAt for chart data
        const orderDate = new Date(order.completedAt || order.settledAt || order.createdAt);
        const date = format(orderDate, 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + (order.totalAmount || order.total || 0);
      } catch (error) {
        console.warn('Error processing daily sales for order:', order.id, error);
      }
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
    try {
      const headers = ['Date', 'Order #', 'Type', 'Items', 'Payment Method', 'Amount'];
      
      // Create order data for the report
      const orderData = filteredOrders.map(order => {
        try {
          // Use completedAt or settledAt for report date
          const orderDate = new Date(order.completedAt || order.settledAt || order.createdAt);
          return [
            formatDateForCSV(orderDate),
            order.orderNumber || 'Unknown',
            order.orderType === 'dinein' ? 'Dine-in' : 'Delivery',
            order.items.reduce((sum: number, item: OrderItem) => sum + (item.quantity || 1), 0),
            (order.paymentMethod || 'CASH').toUpperCase(),
            formatCurrencyForCSV(order.totalAmount || order.total || 0)
          ];
        } catch (error) {
          console.warn('Error processing order for report:', order.id, error);
          return [
            'Invalid Date',
            order.orderNumber || 'Unknown',
            'Unknown',
            0,
            (order.paymentMethod || 'CASH').toUpperCase(),
            formatCurrencyForCSV(order.totalAmount || order.total || 0)
          ];
        }
      }).sort((a, b) => {
        try {
          return new Date(a[0]).getTime() - new Date(b[0]).getTime();
        } catch {
          return 0;
        }
      });

      // Add summary rows
      const summaryRows = [
        ['', '', '', '', '', ''],
        ['SUMMARY', '', '', '', '', ''],
        ['Total Orders', '', '', summary.totalOrders.toString(), '', formatCurrencyForCSV(summary.totalRevenue)],
        ['Average Order Value', '', '', '', '', formatCurrencyForCSV(summary.avgOrderValue)],
        ['Total Items Sold', '', '', summary.totalItems.toString(), '', ''],
        ['', 'PAYMENT BREAKDOWN', '', '', '', ''],
        ['UPI Payments', '', '', summary.paymentBreakdown.upi.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.upi.revenue)],
        ['Cash Payments', '', '', summary.paymentBreakdown.cash.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.cash.revenue)],
        ['Card Payments', '', '', summary.paymentBreakdown.card.count.toString(), '', formatCurrencyForCSV(summary.paymentBreakdown.card.revenue)]
      ];

      const csvData = [headers, ...orderData, ...summaryRows];
      
      downloadCSV(csvData, `sales-report-${startDate}-to-${endDate}.csv`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };


  return (
    <DashboardLayout title="Sales Report">
      <div className="space-y-4 sm:space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading report data...</p>
            </div>
          </div>
        )}

        {!loading && (
      <div>
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesReportPage;