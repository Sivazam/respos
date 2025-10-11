import React, { useState } from 'react';
import { format } from 'date-fns';
import { Search, Eye } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSales } from '../../contexts/SalesContext';
import { useReturns } from '../../contexts/ReturnContext';
import { useFeatures } from '../../hooks/useFeatures';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorAlert from '../../components/ui/ErrorAlert';
import ReceiptModal from '../../components/pos/ReceiptModal';
import { Receipt } from '../../types';

const SuperAdminOrdersPage: React.FC = () => {
  const { sales, loading, error } = useSales();
  const { isOrderReturned, getTotalReturnAmount } = useReturns();
  const { features } = useFeatures();
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const viewReceipt = (sale: any) => {
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
  };

  return (
    <DashboardLayout title="Orders Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          
          <div className="text-sm text-gray-600">
            Total Orders: {filteredSales.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading orders...</p>
            </div>
          ) : filteredSales.length === 0 ? (
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
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {filteredSales.map(sale => {
                    const hasReturns = features.canProcessReturns() && isOrderReturned(sale.id);
                    const returnAmount = features.canProcessReturns() ? getTotalReturnAmount(sale.id) : 0;
                    const netAmount = sale.total - returnAmount;
                    
                    return (
                      <tr key={sale.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(sale.createdAt, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="max-w-xs">
                            {sale.items.map((item, index) => (
                              <div key={item.id} className="truncate">
                                {item.quantity}x {item.name}
                                {index < sale.items.length - 1 && ', '}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            sale.paymentMethod === 'cash'
                              ? 'bg-green-100 text-green-800'
                              : sale.paymentMethod === 'card'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {sale.paymentMethod.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasReturns ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Partial Return
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          <div>
                            <div className="font-medium">₹{sale.total.toFixed(2)}</div>
                            {hasReturns && (
                              <div className="text-xs text-red-600">
                                Returns: -₹{returnAmount.toFixed(2)}
                              </div>
                            )}
                            {hasReturns && (
                              <div className="text-xs text-gray-600 font-medium">
                                Net: ₹{netAmount.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewReceipt(sale)}
                            className="inline-flex items-center"
                          >
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    </DashboardLayout>
  );
};

export default SuperAdminOrdersPage;