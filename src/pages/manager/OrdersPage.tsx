import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Clock, 
  Users, 
  DollarSign, 
  Search,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar,
  Download,
  CreditCard,
  Smartphone
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import toast from 'react-hot-toast';

interface CompletedOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: any[];
  totalAmount: number;
  status: 'settled';
  orderType: 'dinein' | 'delivery';
  orderMode?: 'zomato' | 'swiggy' | 'in-store';
  createdAt: Date;
  updatedAt: Date;
  settledAt: Date;
  staffId: string;
  paymentMethod: 'cash' | 'card' | 'upi';
}

const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'dinein' | 'delivery'>('dinein');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Load completed orders from localStorage
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        
        const completedOrders: CompletedOrder[] = [];
        
        // Load completed orders from localStorage
        const completedOrdersKey = `completed_orders_${currentUser?.uid}`;
        const existingOrders = JSON.parse(localStorage.getItem(completedOrdersKey) || '[]');
        
        for (const orderData of existingOrders) {
          const tableNames = orderData.tableIds.map((tableId: string) => {
            return `Table ${tableId}`; // In real implementation, fetch actual table names
          });

          completedOrders.push({
            id: orderData.id,
            orderNumber: orderData.orderNumber,
            tableIds: orderData.tableIds,
            tableNames,
            items: orderData.items,
            totalAmount: orderData.totalAmount,
            status: orderData.status,
            orderType: orderData.orderType,
            orderMode: orderData.orderMode,
            createdAt: new Date(orderData.createdAt),
            updatedAt: new Date(orderData.updatedAt),
            settledAt: new Date(orderData.settledAt),
            staffId: orderData.staffId,
            paymentMethod: orderData.paymentMethod
          });
        }

        setOrders(completedOrders);
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [currentUser?.uid]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = order.orderType === selectedTab;
    
    const matchesDate = order.settledAt.toISOString().split('T')[0] === selectedDate;
    
    return matchesSearch && matchesTab && matchesDate;
  });

  // Get order statistics
  const getStats = () => {
    const todayOrders = orders.filter(order => 
      order.settledAt.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
    );
    
    const dineinOrders = todayOrders.filter(order => order.orderType === 'dinein');
    const deliveryOrders = todayOrders.filter(order => order.orderType === 'delivery');
    
    return {
      total: todayOrders.length,
      dinein: dineinOrders.length,
      delivery: deliveryOrders.length,
      revenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    };
  };

  const stats = getStats();

  // Get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign size={16} className="text-green-600" />;
      case 'card':
        return <CreditCard size={16} className="text-blue-600" />;
      case 'upi':
        return <Smartphone size={16} className="text-purple-600" />;
      default:
        return <DollarSign size={16} className="text-gray-600" />;
    }
  };

  // Get order mode display
  const getOrderModeDisplay = (orderMode?: string) => {
    if (!orderMode) return null;
    
    const modeConfig = {
      zomato: { label: 'Zomato', color: 'bg-pink-100 text-pink-800' },
      swiggy: { label: 'Swiggy', color: 'bg-orange-100 text-orange-800' },
      'in-store': { label: 'In-Store', color: 'bg-blue-100 text-blue-800' }
    };
    
    const config = modeConfig[orderMode as keyof typeof modeConfig];
    return config ? (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    ) : null;
  };

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric'
    });
  };

  // Export orders
  const handleExport = () => {
    try {
      const csvContent = [
        ['Order Number', 'Type', 'Mode', 'Table(s)', 'Items', 'Total', 'Payment Method', 'Date', 'Time'],
        ...filteredOrders.map(order => [
          order.orderNumber,
          order.orderType,
          order.orderMode || 'N/A',
          order.tableNames.join(', '),
          order.items.length.toString(),
          order.totalAmount.toFixed(2),
          order.paymentMethod,
          formatDate(order.settledAt),
          formatTime(order.settledAt)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${selectedTab}_${selectedDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export orders');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Orders">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders Today</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dine-in</p>
                <p className="text-2xl font-bold text-blue-600">{stats.dinein}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Delivery</p>
                <p className="text-2xl font-bold text-purple-600">{stats.delivery}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue Today</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{stats.revenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setSelectedTab('dinein')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                  selectedTab === 'dinein'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dine-in Orders
              </button>
              <button
                onClick={() => setSelectedTab('delivery')}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                  selectedTab === 'delivery'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Delivery Orders
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-md">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                icon={<Calendar size={18} className="text-gray-500" />}
                className="flex-1"
              />
              
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-gray-500" />}
                className="flex-1"
              />
              
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500">
              {searchTerm || selectedDate !== new Date().toISOString().split('T')[0]
                ? 'No orders match your filters'
                : `No ${selectedTab} orders for ${formatDate(new Date(selectedDate))}`
              }
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{order.tableNames.join(', ')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            order.orderType === 'dinein' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {order.orderType === 'dinein' ? 'Dine-in' : 'Delivery'}
                          </span>
                          {getOrderModeDisplay(order.orderMode)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.items.length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-green-600">
                          ₹{order.totalAmount.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getPaymentMethodIcon(order.paymentMethod)}
                          <span className="text-sm text-gray-900 capitalize">
                            {order.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <p>{formatTime(order.settledAt)}</p>
                          <p className="text-xs">{formatDate(order.settledAt)}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrdersPage;