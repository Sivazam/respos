import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, CheckCircle, AlertCircle, ChefHat, Truck, Eye, Receipt, CreditCard, Smartphone, DollarSign } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/db';
import Button from '../../components/ui/Button';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import { Card } from '../../components/ui/card';
import toast from 'react-hot-toast';

interface CompletedOrder {
  id: string;
  orderNumber: string;
  tableIds: string[];
  tableNames: string[];
  items: any[];
  totalAmount: number;
  status: 'settled' | 'completed';
  orderType: 'dinein' | 'delivery';
  orderMode?: 'zomato' | 'swiggy' | 'in-store';
  createdAt: Date;
  updatedAt: Date;
  settledAt: Date;
  staffId: string;
  paymentMethod: 'cash' | 'card' | 'upi';
  paymentData?: any;
  customerName?: string;
  notes?: string;
}

const StaffOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);

  // Load completed orders from multiple sources
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
        
        // Source 3: Load from Firestore orders collection (completed/settled orders)
        let firestoreOrders: any[] = [];
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
                notes: data.notes
              };
            });

            // Filter client-side and sort by creation date (newest first)
            firestoreOrders = allLocationOrders
              .filter(order => 
                order.staffId === currentUser.uid && 
                ['completed', 'settled'].includes(order.status)
              )
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          } catch (firestoreError) {
            console.error('Error loading from Firestore:', firestoreError);
          }
        }
        
        // Combine all sources and avoid duplicates
        const allOrders = [...existingOrders, ...locationOrders, ...firestoreOrders];
        const uniqueOrders = allOrders.filter((order, index, self) => 
          index === self.findIndex((o) => o.id === order.id)
        );
        
        for (const orderData of uniqueOrders) {
          const tableNames = orderData.tableIds && orderData.tableIds.length > 0 
            ? orderData.tableIds.map((tableId: string) => `Table ${tableId}`)
            : orderData.tableNames || [];

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

  // Apply filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.settledAt);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(order => new Date(order.settledAt) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(order => new Date(order.settledAt) >= monthAgo);
        break;
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [orders, statusFilter, dateFilter, searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'settled':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'settled':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'upi': return 'UPI';
      default: return method;
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
      <DashboardLayout title="My Orders">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Orders">
      <div className="space-y-6">
        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="settled">Settled</option>
              </select>
              
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders List */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Your Orders ({filteredOrders.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'today'
                    ? 'Try adjusting your filters'
                    : 'You haven\'t completed any orders yet'
                  }
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          Settled: {format(new Date(order.settledAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {order.customerName && <span>Customer: {order.customerName}</span>}
                        {order.tableNames.length > 0 && <span className="ml-4">Table: {order.tableNames.join(', ')}</span>}
                        <span className="ml-4">Type: {order.orderType}</span>
                        {order.orderMode && <span className="ml-4">Mode: {order.orderMode}</span>}
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <span key={index}>
                            {item.quantity}x {item.name}
                            {index < Math.min(2, order.items.length - 1) && ', '}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span> +{order.items.length - 3} more</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          {getPaymentMethodIcon(order.paymentMethod)}
                          <span className="text-gray-600">Paid via {getPaymentMethodLabel(order.paymentMethod)}</span>
                        </div>
                        {order.notes && (
                          <span className="text-gray-500">Note: {order.notes}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        ₹{order.totalAmount.toFixed(2)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(order)}
                        className="flex items-center gap-1"
                      >
                        <Eye size={14} />
                        View Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
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
          onPaymentComplete={() => {}}
          isReadOnly={true}
        />
      )}
    </DashboardLayout>
  );
};

export default StaffOrdersPage;