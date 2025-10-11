import React, { useState } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSales } from '../../contexts/SalesContext';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import ReceiptModal from '../../components/pos/ReceiptModal';
import OptimizedOrderList from '../../components/pos/OptimizedOrderList';
import PerformanceMonitor from '../../components/pos/PerformanceMonitor';
import { Receipt } from '../../types';

const OrdersPage: React.FC = () => {
  const { sales, loading, error } = useSales();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [useOptimizedView, setUseOptimizedView] = useState(false);

  // Convert sales to orders format for OptimizedOrderList
  const orders = sales.map(sale => ({
    id: sale.id,
    orderNumber: sale.id.slice(0, 8),
    tableNumber: 'Takeaway',
    status: 'completed' as const,
    items: sale.items.map(item => ({
      id: item.id,
      product: {
        id: item.id,
        name: item.name,
        price: item.price
      },
      quantity: item.quantity,
      totalPrice: item.price * item.quantity
    })),
    totalAmount: sale.total,
    createdAt: sale.createdAt,
    updatedAt: sale.createdAt,
    paymentMethod: sale.paymentMethod,
    customerName: '',
    notes: ''
  }));

  // Filter orders by current user and search term
  const filteredOrders = orders.filter(order => {
    const matchesUser = true; // Since we're using the orders array
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some(item => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesUser && matchesSearch;
  });

  const viewReceipt = (order: any) => {
    const sale = sales.find(s => s.id === order.id);
    if (sale) {
      const receipt: Receipt = {
        sale,
        businessName: 'ForkFlow',
        businessAddress: '123 Food Street, Bangalore, Karnataka 560001',
        gstNumber: 'GSTIN29ABCDE1234F1Z5',
        contactNumber: '+91 80 1234 5678',
        email: 'contact@millethomefoods.com'
      };
      setSelectedReceipt(receipt);
      setShowReceipt(true);
    }
  };

  const printReceipt = (order: any) => {
    viewReceipt(order);
  };

  return (
    <DashboardLayout title="Orders History">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          
          <button
            onClick={() => setUseOptimizedView(!useOptimizedView)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              useOptimizedView
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {useOptimizedView ? 'Optimized View' : 'Table View'}
          </button>
        </div>

        {useOptimizedView ? (
          <OptimizedOrderList
            orders={filteredOrders}
            onViewOrder={viewReceipt}
            onPrintReceipt={printReceipt}
          />
        ) : (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No orders found matching your search.' : 'No orders yet.'}
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
                        Order ID
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {order.items.map((item, index) => (
                            <div key={item.id}>
                              {item.quantity}x {item.product.name}
                              {index < order.items.length - 1 && ', '}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.paymentMethod === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : order.paymentMethod === 'card'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {order.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ₹{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewReceipt(order)}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showReceipt && selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedReceipt(null);
          }}
          onPrint={() => {}} // Print function is now handled internally
        />
      )}

      {/* Performance Monitor */}
      <PerformanceMonitor />
    </DashboardLayout>
  );
};

export default OrdersPage;