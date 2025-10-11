import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useProducts } from '../../contexts/ProductContext';
import { usePurchases } from '../../contexts/PurchaseContext';
import PurchaseForm from '../../components/purchase/PurchaseForm';
import Button from '../../components/ui/Button';
import ErrorAlert from '../../components/ui/ErrorAlert';

const SuperAdminPurchasePage: React.FC = () => {
  const { products } = useProducts();
  const { purchases, loading, error, addPurchase } = usePurchases();
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      await addPurchase(data);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to add purchase:', err);
    }
  };

  return (
    <DashboardLayout title="Stock Purchase">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} className="mr-1" />
            Add Purchase
          </Button>
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add New Purchase</h2>
            <PurchaseForm
              products={products}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading purchases...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No purchases recorded yet
                      </td>
                    </tr>
                  ) : (
                    purchases.map(purchase => (
                      <tr key={purchase.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(purchase.createdAt, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {purchase.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {purchase.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{purchase.costPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {purchase.invoiceNumber || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminPurchasePage;