import React, { useState, useMemo } from 'react';
import { BarChart, TrendingUp, Users, MapPin, DollarSign, Calendar } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Input from '../../components/ui/Input';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const GlobalAnalyticsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Mock data for global analytics
  const globalData = useMemo(() => ({
    totalRevenue: 2450000,
    totalFranchises: 15,
    totalLocations: 42,
    totalUsers: 156,
    totalTransactions: 8420,
    averageOrderValue: 291,
    franchisePerformance: [
      { name: 'Mumbai', revenue: 450000, transactions: 1520, growth: 12.5 },
      { name: 'Delhi', revenue: 380000, transactions: 1280, growth: 8.3 },
      { name: 'Bangalore', revenue: 320000, transactions: 1100, growth: 15.2 },
      { name: 'Chennai', revenue: 290000, transactions: 980, growth: 6.7 },
      { name: 'Hyderabad', revenue: 250000, transactions: 850, growth: 9.8 }
    ],
    monthlyTrends: [
      { month: 'Jan', revenue: 1800000, transactions: 6200 },
      { month: 'Feb', revenue: 2100000, transactions: 7100 },
      { month: 'Mar', revenue: 2450000, transactions: 8420 },
      { month: 'Apr', revenue: 2200000, transactions: 7800 },
      { month: 'May', revenue: 2600000, transactions: 9200 },
      { month: 'Jun', revenue: 2800000, transactions: 9800 }
    ],
    topProducts: [
      { name: 'Organic Quinoa', sales: 1250, revenue: 125000 },
      { name: 'Millet Flour Mix', sales: 980, revenue: 98000 },
      { name: 'Brown Rice', sales: 850, revenue: 85000 },
      { name: 'Chia Seeds', sales: 720, revenue: 108000 },
      { name: 'Oats Premium', sales: 650, revenue: 65000 }
    ]
  }), []);

  // Prepare chart data
  const revenueChartData = {
    labels: globalData.franchisePerformance.map(f => f.name),
    datasets: [{
      label: 'Revenue (₹)',
      data: globalData.franchisePerformance.map(f => f.revenue),
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgb(34, 197, 94)',
      borderWidth: 1
    }]
  };

  const trendChartData = {
    labels: globalData.monthlyTrends.map(t => t.month),
    datasets: [
      {
        label: 'Revenue (₹)',
        data: globalData.monthlyTrends.map(t => t.revenue),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      },
      {
        label: 'Transactions',
        data: globalData.monthlyTrends.map(t => t.transactions),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const productChartData = {
    labels: globalData.topProducts.map(p => p.name),
    datasets: [{
      data: globalData.topProducts.map(p => p.revenue),
      backgroundColor: [
        'rgba(34, 197, 94, 0.2)',
        'rgba(59, 130, 246, 0.2)',
        'rgba(168, 85, 247, 0.2)',
        'rgba(245, 158, 11, 0.2)',
        'rgba(239, 68, 68, 0.2)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(168, 85, 247)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <DashboardLayout title="Global Analytics">
      <div className="space-y-6">
        {/* Date Range Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
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
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <h3 className="text-2xl font-semibold text-gray-900">₹{(globalData.totalRevenue / 100000).toFixed(1)}L</h3>
                <p className="text-xs text-green-600 mt-1">+12.5% from last month</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Franchises</p>
                <h3 className="text-2xl font-semibold text-gray-900">{globalData.totalFranchises}</h3>
                <p className="text-xs text-blue-600 mt-1">+2 new this month</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <h3 className="text-2xl font-semibold text-gray-900">{globalData.totalLocations}</h3>
                <p className="text-xs text-purple-600 mt-1">+5 new locations</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-amber-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <h3 className="text-2xl font-semibold text-gray-900">₹{globalData.averageOrderValue}</h3>
                <p className="text-xs text-amber-600 mt-1">+8.3% improvement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Franchise Performance</h3>
            <div className="h-80">
              <Bar
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${(Number(value) / 1000).toFixed(0)}K`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
            <div className="h-80">
              <Line
                data={trendChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear' as const,
                      display: true,
                      position: 'left' as const,
                      ticks: {
                        callback: (value) => `₹${(Number(value) / 100000).toFixed(1)}L`
                      }
                    },
                    y1: {
                      type: 'linear' as const,
                      display: true,
                      position: 'right' as const,
                      grid: {
                        drawOnChartArea: false,
                      },
                      ticks: {
                        callback: (value) => `${(Number(value) / 1000).toFixed(0)}K`
                      }
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products by Revenue</h3>
            <div className="h-80">
              <Pie
                data={productChartData}
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
                          return `${label}: ₹${(value / 1000).toFixed(0)}K`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Franchise Growth Rates</h3>
            <div className="space-y-4">
              {globalData.franchisePerformance.map((franchise, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{franchise.name}</p>
                    <p className="text-xs text-gray-500">{franchise.transactions} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      franchise.growth > 10 ? 'text-green-600' : 
                      franchise.growth > 5 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      +{franchise.growth}%
                    </p>
                    <p className="text-xs text-gray-500">growth</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Detailed Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Franchise
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Growth Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {globalData.franchisePerformance.map((franchise, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {franchise.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{(franchise.revenue / 1000).toFixed(0)}K
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {franchise.transactions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{Math.round(franchise.revenue / franchise.transactions)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        franchise.growth > 10 ? 'bg-green-100 text-green-800' :
                        franchise.growth > 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        +{franchise.growth}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GlobalAnalyticsPage;