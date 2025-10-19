import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Clock, 
  Users, 
  DollarSign, 
  Search,
  AlertCircle,
  Calendar,
  Download,
  CreditCard,
  Smartphone,
  Eye
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/db';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card } from '../../components/ui/card';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import toast from 'react-hot-toast';
import { downloadCSV, formatCurrencyForCSV } from '../../utils/csvExport';

interface CompletedOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: unknown[];
  totalAmount: number;
  status: 'settled';
  orderType: 'dinein' | 'delivery';
  orderMode?: 'zomato' | 'swiggy' | 'in-store';
  createdAt: Date;
  updatedAt: Date;
  settledAt: Date;
  staffId: string;
  paymentMethod: 'cash' | 'card' | 'upi';
  locationId?: string;
  appliedCoupon?: {
    couponId: string;
    name: string;
    type: 'fixed' | 'percentage';
    discountAmount: number;
    appliedAt: any;
  } | null;
  subtotal?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  gstAmount?: number;
  paymentData?: any;
  customerName?: string;
  notes?: string;
}

const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'dinein' | 'delivery'>('dinein');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);

  // Load completed orders from multiple sources including Firestore
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        
        const completedOrders: CompletedOrder[] = [];
        
        // Source 1: Load completed orders from localStorage (user-specific)
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
        
        // Source 7: Load from Firestore orders collection (completed/settled orders)
        let firestoreOrders: CompletedOrder[] = [];
        if (currentUser?.locationId) {
          try {
            // Simplified query to avoid ALL index requirements - fetch all orders for location without ordering
            const ordersQuery = query(
              collection(db, 'orders'),
              where('locationId', '==', currentUser.locationId)
            );
            
            const querySnapshot = await getDocs(ordersQuery);
            const allLocationOrders = querySnapshot.docs.map(doc => {
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
                settledAt: data.completedAt?.toDate?.() || data.settledAt?.toDate?.() || data.createdAt,
                staffId: data.staffId,
                paymentMethod: data.paymentData?.paymentMethod || data.paymentMethod || 'cash',
                paymentData: data.paymentData,
                customerName: data.customerName,
                notes: data.notes,
                locationId: data.locationId,
                appliedCoupon: data.appliedCoupon || null,
                subtotal: data.subtotal || 0,
                cgstAmount: data.cgstAmount || 0,
                sgstAmount: data.sgstAmount || 0,
                gstAmount: data.gstAmount || 0
              };
            });

            // Filter client-side and sort by creation date (newest first)
            firestoreOrders = allLocationOrders
              .filter(order => 
                ['completed', 'settled'].includes(order.status)
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          } catch (firestoreError) {
            console.error('Error loading from Firestore:', firestoreError);
          }
        }
        
        // Combine all sources and avoid duplicates
        const allOrders = [
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
            locationId: sale.locationId || currentUser?.locationId,
            appliedCoupon: sale.appliedCoupon || null,
            subtotal: sale.subtotal || 0,
            cgstAmount: sale.cgstAmount || 0,
            sgstAmount: sale.sgstAmount || 0,
            gstAmount: sale.gstAmount || 0,
            paymentData: sale.paymentData,
            customerName: sale.customerName,
            notes: sale.notes
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
            locationId: sale.locationId || currentUser?.locationId,
            appliedCoupon: sale.appliedCoupon || null,
            subtotal: sale.subtotal || 0,
            cgstAmount: sale.cgstAmount || 0,
            sgstAmount: sale.sgstAmount || 0,
            gstAmount: sale.gstAmount || 0,
            paymentData: sale.paymentData,
            customerName: sale.customerName,
            notes: sale.notes
          })),
          ...firestoreOrders
        ];
        
        const uniqueOrders = allOrders.filter((order, index, self) => 
          index === self.findIndex((o) => o.id === order.id)
        );
        
        for (const orderData of uniqueOrders) {
          const tableNames = orderData.tableNames && orderData.tableNames.length > 0 
            ? orderData.tableNames
            : orderData.tableIds && orderData.tableIds.length > 0 
              ? orderData.tableIds.map((tableId: string) => {
                  // Try to extract table number from ID
                  const tableMatch = tableId.match(/table-(\d+)/i);
                  if (tableMatch) {
                    return `Table ${tableMatch[1]}`;
                  }
                  if (/^\d+$/.test(tableId)) {
                    return `Table ${tableId}`;
                  }
                  const numberMatch = tableId.match(/\d+/);
                  if (numberMatch) {
                    return `Table ${numberMatch[0]}`;
                  }
                  return tableId;
                })
              : [];

          completedOrders.push({
            id: orderData.id,
            orderNumber: orderData.orderNumber,
            tableIds: orderData.tableIds || [],
            tableNames,
            items: orderData.items || [],
            totalAmount: Number(orderData.totalAmount) || 0,
            status: orderData.status,
            orderType: orderData.orderType,
            orderMode: orderData.orderMode,
            createdAt: new Date(orderData.createdAt),
            updatedAt: new Date(orderData.updatedAt),
            settledAt: new Date(orderData.settledAt),
            staffId: orderData.staffId,
            paymentMethod: orderData.paymentMethod || 'cash',
            locationId: orderData.locationId || currentUser?.locationId,
            appliedCoupon: orderData.appliedCoupon || null,
            subtotal: orderData.subtotal || 0,
            cgstAmount: orderData.cgstAmount || 0,
            sgstAmount: orderData.sgstAmount || 0,
            gstAmount: orderData.gstAmount || 0,
            paymentData: orderData.paymentData,
            customerName: orderData.customerName,
            notes: orderData.notes
          });
        }

        // Sort by settledAt date descending
        completedOrders.sort((a, b) => b.settledAt.getTime() - a.settledAt.getTime());
        setOrders(completedOrders);
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [currentUser?.uid, currentUser?.locationId]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = order.orderType === selectedTab;
    
    const orderDate = order.settledAt.toISOString().split('T')[0];
    const matchesDateRange = orderDate >= startDate && orderDate <= endDate;
    
    return matchesSearch && matchesTab && matchesDateRange;
  });

  // Get order statistics
  const getStats = () => {
    const dateRangeOrders = orders.filter(order => {
      const orderDate = order.settledAt.toISOString().split('T')[0];
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const dineinOrders = dateRangeOrders.filter(order => order.orderType === 'dinein');
    const deliveryOrders = dateRangeOrders.filter(order => order.orderType === 'delivery');
    
    const upiPayments = dateRangeOrders.filter(order => order.paymentMethod === 'upi');
    const cashPayments = dateRangeOrders.filter(order => order.paymentMethod === 'cash');
    const cardPayments = dateRangeOrders.filter(order => order.paymentMethod === 'card');
    
    return {
      total: dateRangeOrders.length,
      dinein: dineinOrders.length,
      delivery: deliveryOrders.length,
      revenue: dateRangeOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      upiRevenue: upiPayments.reduce((sum, order) => sum + order.totalAmount, 0),
      cashRevenue: cashPayments.reduce((sum, order) => sum + order.totalAmount, 0),
      cardRevenue: cardPayments.reduce((sum, order) => sum + order.totalAmount, 0),
      upiCount: upiPayments.length,
      cashCount: cashPayments.length,
      cardCount: cardPayments.length
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
      const csvData = [
        ['Order Number', 'Type', 'Mode', 'Table(s)', 'Items', 'Total', 'Payment Method', 'Date', 'Time'],
        ...filteredOrders.map(order => [
          order.orderNumber || 'Unknown',
          order.orderType || 'Unknown',
          order.orderMode || 'N/A',
          order.tableNames.join(', '),
          order.items.length.toString(),
          formatCurrencyForCSV(order.totalAmount || 0),
          order.paymentMethod || 'Unknown',
          formatDate(order.settledAt),
          formatTime(order.settledAt)
        ])
      ];

      downloadCSV(csvData, `orders-${selectedTab}-${startDate}-to-${endDate}.csv`);
      
      toast.success('Orders exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export orders');
    }
  };

  // View receipt
  const handleViewReceipt = (order: CompletedOrder) => {
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };

  // Close receipt modal
  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setSelectedOrder(null);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
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
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{stats.revenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Payment Method Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">UPI Payments</p>
                <p className="text-xl font-bold text-purple-600">
                  ₹{stats.upiRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{stats.upiCount} transactions</p>
              </div>
              <Smartphone className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cash Payments</p>
                <p className="text-xl font-bold text-green-600">
                  ₹{stats.cashRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{stats.cashCount} transactions</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Card Payments</p>
                <p className="text-xl font-bold text-blue-600">
                  ₹{stats.cardRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{stats.cardCount} transactions</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
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
            <div className="flex flex-col lg:flex-row gap-3 flex-1 lg:max-w-xl">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  icon={<Calendar size={18} className="text-gray-500" />}
                  placeholder="Start Date"
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  icon={<Calendar size={18} className="text-gray-500" />}
                  placeholder="End Date"
                  className="flex-1"
                />
              </div>
              
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-gray-500" />}
                className="flex-1 lg:max-w-xs"
              />
              
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2 whitespace-nowrap"
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
              {searchTerm || startDate !== endDate || startDate !== new Date().toISOString().split('T')[0]
                ? 'No orders match your filters'
                : `No ${selectedTab} orders for selected date range`
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReceipt(order)}
                            title="View Receipt"
                          >
                            <Eye size={16} />
                          </Button>
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

      {/* Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <FinalReceiptModal
          isOpen={showReceiptModal}
          onClose={handleCloseReceipt}
          order={{
            ...selectedOrder,
            paymentData: {
              paymentMethod: selectedOrder.paymentMethod,
              settledAt: selectedOrder.settledAt
            }
          }}
          paymentMethod={selectedOrder.paymentMethod}
          isReadOnly={true}
        />
      )}
    </DashboardLayout>
  );
};

export default OrdersPage;