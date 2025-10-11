import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useReturns } from '../../contexts/ReturnContext';
import { useSales } from '../../contexts/SalesContext';
import { usePurchases } from '../../contexts/PurchaseContext';
import ReturnForm from '../../components/returns/ReturnForm';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';

const ReturnsPage: React.FC = () => {
  const { returns, loading, error, addReturn } = useReturns();
  const { sales } = useSales();
  const { purchases } = usePurchases();
  
  const [showForm, setShowForm] = useState(false);
  const [returnType, setReturnType] = useState<'sale' | 'purchase'>('sale');
  const [referenceId, setReferenceId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (data: any) => {
    try {
      await addReturn(data);
      setShowForm(false);
      setReferenceId('');
    } catch (err) {
      console.error('Failed to process return:', err);
    }
  };

  const reference = returnType === 'sale'
    ? sales.find(s => s.id === referenceId)
    : purchases.find(p => p.id === referenceId);

  const filteredReturns = returns.filter(r =>
    r.items.some(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Returns Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Input
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          
          {!showForm && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReturnType('sale');
                  setShowForm(true);
                }}
              >
                <ArrowUpCircle size={18} className="mr-1" />
                Sales Return
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReturnType('purchase');
                  setShowForm(true);
                }}
              >
                <ArrowDownCircle size={18} className="mr-1" />
                Purchase Return
              </Button>
            </div>
          )}
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Process {returnType === 'sale' ? 'Sales' : 'Purchase'} Return
            </h2>
            
            {/* Reference ID Input */}
            {!reference && (
              <div className="mb-6">
                <Input
                  label={`${returnType === 'sale' ? 'Sale' : 'Purchase'} Reference ID`}
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Enter reference ID"
                />
              </div>
            )}

            {reference ? (
              <ReturnForm
                type={returnType}
                reference={reference}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setReferenceId('');
                }}
              />
            ) : referenceId && (
              <div className="text-center py-4 text-gray-500">
                No {returnType} found with ID: {referenceId}
              </div>
            )}
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
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading returns...
                      </td>
                    </tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        No returns found
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map(returnItem => (
                      <tr key={returnItem.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(returnItem.createdAt, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            returnItem.type === 'sale'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {returnItem.type === 'sale' ? 'Sales Return' : 'Purchase Return'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {returnItem.items.map(item => (
                            <div key={item.id}>
                              {item.quantity}x {item.name}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {returnItem.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{returnItem.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Processed
                          </span>
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

export default ReturnsPage;