import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/db';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useSales } from '../../contexts/SalesContext';
import { useReturns } from '../../contexts/ReturnContext';
import { useStock } from '../../contexts/StockContext';
import { useFeatures } from '../../hooks/useFeatures';
import { format } from 'date-fns';
import { BarChart, Package, AlertCircle, RefreshCcw, ShoppingCart, Receipt, Eye } from 'lucide-react';
import Button from '../../components/ui/Button';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';

const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { menuItems } = useMenuItems();
  const { sales } = useSales();
  const { returns } = useReturns();
  const { stockUpdates } = useStock();
  const { features } = useFeatures();
  
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [localSales, setLocalSales] = useState<any[]>([]);

  // Load sales from localStorage and Firestore to supplement data
  useEffect(() => {
    const loadLocalSales = async () => {
      try {
        const allSales: any[] = [];
        
        // Load from different localStorage sources
        const salesKeys = [
          'sales',
          `sales_${currentUser?.locationId || 'default'}`,
          'completed_orders_admin',
          'completed_orders_owner'
        ];
        
        salesKeys.forEach(key => {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          allSales.push(...data);
        });
        
        // Load from Firestore orders collection (completed/settled orders)
        let firestoreOrders: any[] = [];
        try {
          let ordersQuery;
          
          if (currentUser?.role === 'superadmin') {
            // Simplified query to avoid ALL index requirements - fetch all orders without ordering
            ordersQuery = query(collection(db, 'orders'));
          } else if (currentUser?.franchiseId) {
            // First get all locations for this franchise
            const locationsQuery = query(
              collection(db, 'locations'),
              where('franchiseId', '==', currentUser.franchiseId)
            );
            const locationsSnapshot = await getDocs(locationsQuery);
            const locationIds = locationsSnapshot.docs.map(doc => doc.id);
            
            if (locationIds.length > 0) {
              // Simplified query - fetch orders for each location separately to avoid 'in' clause
              const allLocationOrders: any[] = [];
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
                    invoiceNumber: data.orderNumber,
                    total: data.totalAmount || data.total || 0,
                    subtotal: data.subtotal || data.totalAmount || data.total || 0,
                    cgstAmount: data.cgstAmount || 0,
                    sgstAmount: data.sgstAmount || 0,
                    gstAmount: data.gstAmount || 0,
                    paymentMethod: data.paymentData?.paymentMethod || data.paymentMethod || 'cash',
                    paymentStatus: 'paid',
                    status: data.status,
                    items: data.items || [],
                    customerName: data.customerName || 'Walk-in Customer',
                    createdAt: data.createdAt?.toDate?.() || data.createdAt,
                    locationId: data.locationId
                  };
                });
                allLocationOrders.push(...locationOrders);
              }
              // Filter client-side for completed/settled orders and sort
              firestoreOrders = allLocationOrders
                .filter(order => 
                  ['completed', 'settled'].includes(order.status)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
          } else if (currentUser?.locationId) {
            // Simplified query to avoid ALL index requirements
            ordersQuery = query(
              collection(db, 'orders'),
              where('locationId', '==', currentUser.locationId)
            );
          }
          
          if (ordersQuery) {
            const querySnapshot = await getDocs(ordersQuery);
            const allOrders = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                invoiceNumber: data.orderNumber,
                total: data.totalAmount || data.total || 0,
                subtotal: data.subtotal || data.totalAmount || data.total || 0,
                cgstAmount: data.cgstAmount || 0,
                sgstAmount: data.sgstAmount || 0,
                gstAmount: data.gstAmount || 0,
                paymentMethod: data.paymentData?.paymentMethod || data.paymentMethod || 'cash',
                paymentStatus: 'paid',
                status: data.status,
                items: data.items || [],
                customerName: data.customerName || 'Walk-in Customer',
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                locationId: data.locationId
              };
            });

            // Filter client-side for completed/settled orders and sort (except for franchise case which is already filtered)
            if (currentUser?.role !== 'superadmin' && !currentUser?.franchiseId) {
              firestoreOrders = allOrders
                .filter(order => 
                  ['completed', 'settled'].includes(order.status)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            } else if (currentUser?.role === 'superadmin') {
              firestoreOrders = allOrders
                .filter(order => 
                  ['completed', 'settled'].includes(order.status)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
          }
        } catch (firestoreError) {
          console.error('Error loading from Firestore:', firestoreError);
        }
        
        // Remove duplicates based on ID
        const uniqueSales = [...allSales, ...firestoreOrders].filter((sale, index, self) => 
          index === self.findIndex((s) => s.id === sale.id)
        );
        
        setLocalSales(uniqueSales);
      } catch (error) {
        console.error('Failed to load local sales:', error);
      }
    };
    
    loadLocalSales();
  }, [currentUser?.locationId, currentUser?.franchiseId, currentUser?.role]);
  
  // Combine Firestore and localStorage sales
  const allSales = [...sales, ...localSales];
  
  // Calculate sales metrics (with or without returns based on feature config)
  const totalSales = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalReturns = features.canProcessReturns() 
    ? returns.filter(ret => ret.type === 'sale').reduce((sum, ret) => sum + ret.total, 0)
    : 0;
  const netSales = totalSales - totalReturns;
  
  // Calculate transaction metrics
  const totalTransactions = allSales.length;
  const totalSalesReturns = features.canProcessReturns() 
    ? returns.filter(ret => ret.type === 'sale').length 
    : 0;
  const netTransactions = totalTransactions - totalSalesReturns;
  
  // Calculate items sold metrics
  const totalItemsSold = allSales.reduce((sum, sale) => 
    sum + (sale.items || []).reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0), 0);
  const totalItemsReturned = features.canProcessReturns()
    ? returns
        .filter(ret => ret.type === 'sale')
        .reduce((sum, ret) => 
          sum + ret.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
    : 0;
  const netItemsSold = totalItemsSold - totalItemsReturned;
  
  // Count available menu items
  const availableMenuItems = menuItems.filter(item => item.isAvailable).length;

  // Get recent activities (conditionally include returns)
  const recentActivities = [
    ...allSales.map(sale => ({
      type: 'sale',
      date: sale.createdAt,
      details: `Sale #${sale.invoiceNumber || sale.orderNumber} - ${(sale.items || []).length} items, Total: ₹${(sale.total || 0).toFixed(2)}`,
      sale: sale
    })),
    // Only include returns if the feature is enabled
    ...(features.canProcessReturns() ? returns.map(ret => ({
      type: 'return',
      date: ret.createdAt,
      details: `${ret.type === 'sale' ? 'Sales' : 'Purchase'} Return - ${ret.items.length} items, Total: ₹${ret.total.toFixed(2)}`,
    })) : []),
    ...stockUpdates.map(update => ({
      type: 'stock',
      date: update.createdAt,
      details: `Stock ${update.quantity > 0 ? 'added' : 'reduced'} - ${Math.abs(update.quantity)} units`,
    }))
  ]
  .sort((a, b) => b.date.getTime() - a.date.getTime())
  .slice(0, 15);
  
  // View receipt
  const handleViewReceipt = (sale: any) => {
    const orderData = {
      id: sale.id,
      orderNumber: sale.invoiceNumber || sale.orderNumber,
      tableIds: sale.tableNames || [],
      tableNames: sale.tableNames || [],
      items: sale.items || [],
      subtotal: sale.subtotal || sale.total || 0,
      cgstAmount: sale.cgstAmount || 0,
      sgstAmount: sale.sgstAmount || 0,
      gstAmount: sale.gstAmount || 0,
      totalAmount: sale.total || 0,
      paymentMethod: sale.paymentMethod || 'cash',
      settledAt: sale.createdAt,
      staffId: sale.staffId,
      customerName: sale.customerName,
      notes: sale.notes
    };
    
    setSelectedOrder(orderData);
    setShowReceiptModal(true);
  };

  // Close receipt modal
  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setSelectedOrder(null);
  };

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Welcome, Admin</h2>
              <p className="text-sm sm:text-base text-gray-600">
                You're logged in as an administrator with full access to all system features.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin/orders'}
              className="flex items-center gap-2"
            >
              <Receipt size={16} />
              View All Orders
            </Button>
          </div>
          
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-green-50 overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-2 sm:p-3">
                    <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-green-700" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {features.canProcessReturns() ? 'Net Sales' : 'Total Sales'}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
                        ₹{netSales.toFixed(2)}
                      </div>
                    </dd>
                    {features.canProcessReturns() && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        Sales: ₹{totalSales.toFixed(2)} | Returns: ₹{totalReturns.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 sm:p-3">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {features.canProcessReturns() ? 'Net Transactions' : 'Total Transactions'}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {netTransactions}
                      </div>
                    </dd>
                    {features.canProcessReturns() && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        Sales: {totalTransactions} | Returns: {totalSalesReturns}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 sm:p-3">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {features.canProcessReturns() ? 'Net Items Sold' : 'Total Items Sold'}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {netItemsSold}
                      </div>
                    </dd>
                    {features.canProcessReturns() && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        Sold: {totalItemsSold} | Returned: {totalItemsReturned}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-amber-100 rounded-md p-2 sm:p-3">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      Available Menu Items
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {availableMenuItems}
                      </div>
                    </dd>
                    <div className="text-xs text-gray-500 mt-1">
                      Total items: {menuItems.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivities.map((activity, idx) => (
                <li key={idx}>
                  <div className="relative pb-8">
                    {idx !== recentActivities.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          activity.type === 'sale' 
                            ? 'bg-green-100' 
                            : activity.type === 'return'
                            ? 'bg-red-100'
                            : 'bg-blue-100'
                        }`}>
                          {activity.type === 'sale' ? (
                            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          ) : activity.type === 'return' ? (
                            <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                          ) : (
                            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex flex-col sm:flex-row sm:justify-between space-y-1 sm:space-y-0 sm:space-x-4">
                        <div className="min-w-0 flex items-center gap-2">
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{activity.details}</p>
                          {activity.type === 'sale' && activity.sale && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewReceipt(activity.sale)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <Eye size={12} />
                              <span className="text-xs">View Receipt</span>
                            </Button>
                          )}
                        </div>
                        <div className="text-right text-xs sm:text-sm whitespace-nowrap text-gray-500">
                          <span className="hidden sm:inline">{format(activity.date, 'MMM dd, HH:mm')}</span>
                          <span className="sm:hidden">{format(activity.date, 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
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

export default AdminDashboard;