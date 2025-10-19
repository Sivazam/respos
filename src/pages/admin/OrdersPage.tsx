import React, { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Search, Eye, Building2, User, Calendar, Filter, Download } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { downloadCSV, formatCurrencyForCSV, formatDateForCSV } from '../../utils/csvExport';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';

interface OrderData {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: any[];
  totalAmount: number;
  status: string;
  orderType: string;
  orderMode: string;
  createdAt: Date;
  updatedAt: Date;
  settledAt: Date;
  staffId: string;
  paymentMethod: string;
  paymentData: any;
  customerName: string;
  notes: string;
  locationId: string;
}

const OrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { locations } = useLocations();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'dinein' | 'delivery'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'upi'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let firestoreOrders: OrderData[] = [];
      
      if (currentUser?.role === 'superadmin') {
        // Superadmin can see all orders without any filtering
        const ordersQuery = query(collection(db, 'orders'));
        const querySnapshot = await getDocs(ordersQuery);
        const allOrders = querySnapshot.docs.map(doc => {
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
            locationId: data.locationId
          };
        });

        // Filter client-side for completed/settled orders and sort
        firestoreOrders = allOrders
          .filter(order => ['completed', 'settled'].includes(order.status))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (currentUser?.franchiseId) {
        // Admin with franchise - get all locations for this franchise
        const locationsQuery = query(
          collection(db, 'locations'),
          where('franchiseId', '==', currentUser.franchiseId)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationIds = locationsSnapshot.docs.map(doc => doc.id);
        
        // Fetch orders for each location
        const allLocationOrders: OrderData[] = [];
        for (const locationId of locationIds) {
          const locationOrdersQuery = query(
            collection(db, 'orders'),
            where('locationId', '==', locationId)
          );
          const locationSnapshot = await getDocs(locationOrdersQuery);
          const locationOrders = locationSnapshot.docs.map(doc => {
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
              locationId: data.locationId
            };
          });
          allLocationOrders.push(...locationOrders);
        }
        
        // Filter and sort
        firestoreOrders = allLocationOrders
          .filter(order => ['completed', 'settled'].includes(order.status))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (currentUser?.locationId) {
        // Admin with single location
        const ordersQuery = query(
          collection(db, 'orders'),
          where('locationId', '==', currentUser.locationId)
        );
        const querySnapshot = await getDocs(ordersQuery);
        const allOrders = querySnapshot.docs.map(doc => {
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
            locationId: data.locationId
          };
        });

        // Filter and sort
        firestoreOrders = allOrders
          .filter(order => ['completed', 'settled'].includes(order.status))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      setOrders(firestoreOrders);
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentUser]);

  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = !selectedLocation || order.locationId === selectedLocation;
    
    // Tab filtering
    const matchesTab = selectedTab === 'all' || 
      (selectedTab === 'dinein' && order.orderType === 'dinein') ||
      (selectedTab === 'delivery' && order.orderType === 'delivery');
    
    // Date filtering
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = orderDate >= startOfDay(now) && orderDate <= endOfDay(now);
          break;
        case 'week':
          const weekAgo = subDays(now, 7);
          matchesDate = orderDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = subDays(now, 30);
          matchesDate = orderDate >= monthAgo;
          break;
      }
    }
    
    // Payment method filtering
    const matchesPayment = paymentFilter === 'all' || order.paymentMethod === paymentFilter;
    
    return matchesSearch && matchesLocation && matchesTab && matchesDate && matchesPayment;
  });

  const viewReceipt = (order: OrderData) => {
    // Calculate subtotal from items
    const subtotal = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const totalAmount = order.totalAmount || subtotal;
    
    // Calculate GST (assuming 5% CGST and 5% SGST if not specified)
    const cgstAmount = Math.round((totalAmount * 0.05) * 100) / 100;
    const sgstAmount = Math.round((totalAmount * 0.05) * 100) / 100;
    
    const receiptOrder = {
      orderNumber: order.orderNumber,
      tableNames: order.tableNames,
      tableIds: order.tableIds,
      items: order.items.map(item => ({
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
        modifications: item.modifications || [],
        portionSize: item.portionSize
      })),
      customerName: order.customerName,
      notes: order.notes,
      subtotal: subtotal,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      gstAmount: cgstAmount + sgstAmount,
      totalAmount: totalAmount,
      completedAt: order.settledAt,
      paymentData: {
        paymentMethod: order.paymentMethod,
        amount: totalAmount,
        settledAt: order.settledAt
      },
      locationId: order.locationId
    };
    
    setSelectedReceipt(receiptOrder);
    setShowReceipt(true);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'upi': return '📱';
      default: return '💵';
    }
  };

  const exportOrders = () => {
    const csvData = [
      ['Date', 'Order #', 'Location', 'Customer', 'Type', 'Payment', 'Items', 'Total'],
      ...filteredOrders.map(order => [
        formatDateForCSV(order.createdAt),
        order.orderNumber || 'Unknown',
        getLocationName(order.locationId),
        order.customerName || 'Walk-in',
        order.orderType || 'dinein',
        order.paymentMethod || 'Unknown',
        order.items.length.toString(),
        formatCurrencyForCSV(order.totalAmount || 0)
      ])
    ];

    downloadCSV(csvData, `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLocation('');
    setSelectedTab('all');
    setDateFilter('all');
    setPaymentFilter('all');
  };

  return (
    <DashboardLayout title="Orders Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setSelectedTab('dinein')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'dinein'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🍽️ Dine-in
            </button>
            <button
              onClick={() => setSelectedTab('delivery')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'delivery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🚚 Delivery
            </button>
          </nav>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-gray-500" />}
              />
            </div>
            
            {/* Location Filter */}
            {currentUser?.role === 'superadmin' && (
              <div className="w-full lg:w-48">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
              {(dateFilter !== 'all' || paymentFilter !== 'all') && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </Button>

            {/* Export */}
            <Button
              variant="outline"
              onClick={exportOrders}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </Button>

            {/* Clear Filters */}
            {(searchTerm || selectedLocation || dateFilter !== 'all' || paymentFilter !== 'all' || selectedTab !== 'all') && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredOrders.length}</span> of{' '}
                <span className="font-medium">{orders.length}</span> orders
              </div>
              <div className="text-sm text-gray-600">
                Total Revenue: <span className="font-medium text-green-600">
                  ₹{filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || selectedLocation || dateFilter !== 'all' || paymentFilter !== 'all' || selectedTab !== 'all' 
                ? 'No orders found matching your criteria.' 
                : 'No orders yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order #
                    </th>
                    {(currentUser?.role === 'superadmin' || currentUser?.franchiseId) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(order.createdAt, 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {order.orderNumber}
                      </td>
                      {(currentUser?.role === 'superadmin' || currentUser?.franchiseId) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Building2 size={14} className="mr-1" />
                            {getLocationName(order.locationId)}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.orderType === 'dinein'
                            ? 'bg-blue-100 text-blue-800'
                            : order.orderType === 'delivery'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.orderType === 'dinein' ? '🍽️' : order.orderType === 'delivery' ? '🚚' : '📦'} {order.orderType || 'dinein'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <User size={14} className="mr-1" />
                          {order.customerName || 'Walk-in'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div key={item.id} className="truncate">
                              {item.quantity}x {item.name}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{order.items.length - 3} more items
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.paymentMethod === 'cash'
                            ? 'bg-green-100 text-green-800'
                            : order.paymentMethod === 'card'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          <span className="mr-1">{getPaymentMethodIcon(order.paymentMethod)}</span>
                          {order.paymentMethod.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        ₹{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewReceipt(order)}
                          className="inline-flex items-center"
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showReceipt && selectedReceipt && (
        <FinalReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedReceipt(null);
          }}
          order={selectedReceipt}
          paymentMethod={selectedReceipt.paymentData?.paymentMethod || 'cash'}
          onPaymentComplete={() => {}}
          isReadOnly={true}
        />
      )}
    </DashboardLayout>
  );
};

export default OrdersPage;