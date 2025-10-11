import React, { useState, useMemo } from 'react';
import { format, startOfToday, endOfToday, isWithinInterval } from 'date-fns';
import { Search, ArrowUpCircle } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useReturns } from '../../contexts/ReturnContext';
import { useSales } from '../../contexts/SalesContext';
import { useAuth } from '../../contexts/AuthContext';
import ReturnForm from '../../components/returns/ReturnForm';
import ReceiptModal from '../../components/pos/ReceiptModal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { Receipt } from '../../types';

const ReturnsPage: React.FC = () => {
  const { returns, loading, error, addReturn, isOrderReturned } = useReturns();
  const { sales } = useSales();
  const { currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);

  // Get today's sales that haven't been returned
  const todaysSales = useMemo(() => {
    const today = new Date();
    return sales.filter(sale => 
      sale.createdBy === currentUser?.uid &&
      isWithinInterval(sale.createdAt, {
        start: startOfToday(),
        end: endOfToday()
      }) &&
      !isOrderReturned(sale.id)
    );
  }, [sales, currentUser, isOrderReturned]);

  const handleSubmit = async (data: any) => {
    try {
      console.log('Processing return with data:', data);
      await addReturn(data);
      
      // Generate return receipt with correct amounts
      const sale = sales.find(s => s.id === data.referenceId);
      if (sale) {
        // Calculate return amounts properly
        const returnSubtotal = data.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const returnCgst = returnSubtotal * 0.025; // 2.5%
        const returnSgst = returnSubtotal * 0.025; // 2.5%
        const returnTotal = data.total || (returnSubtotal + returnCgst + returnSgst);

        console.log('Return receipt calculation:', {
          returnSubtotal,
          returnCgst,
          returnSgst,
          returnTotal,
          dataTotal: data.total
        });

        const receipt: Receipt = {
          sale: {
            ...sale,
            items: data.items,
            subtotal: returnSubtotal,
            cgst: returnCgst,
            sgst: returnSgst,
            total: returnTotal,
            paymentMethod: data.refundMethod || 'cash'
          },
          businessName: 'ForkFlow',
          businessAddress: '123 Food Street, Bangalore, Karnataka 560001',
          gstNumber: 'GSTIN29ABCDE1234F1Z5',
          contactNumber: '+91 80 1234 5678',
          email: 'contact@millethomefoods.com'
        };
        
        console.log('Generated return receipt:', receipt);
        setCurrentReceipt(receipt);
        setShowReceipt(true);
      }

      setShowForm(false);
      setSelectedSale(null);
    } catch (err) {
      console.error('Failed to process return:', err);
    }
  };

  const viewReturnReceipt = (returnItem: any) => {
    const sale = sales.find(s => s.id === returnItem.referenceId);
    if (sale) {
      // Calculate proper return amounts
      const returnSubtotal = returnItem.items.reduce((sum: any, item: any) => sum + (item.price * item.quantity), 0);
      const returnCgst = returnSubtotal * 0.025;
      const returnSgst = returnSubtotal * 0.025;
      const returnTotal = returnItem.total;

      console.log('Viewing return receipt:', {
        returnSubtotal,
        returnCgst,
        returnSgst,
        returnTotal,
        originalTotal: returnItem.total
      });

      const receipt: Receipt = {
        sale: {
          ...sale,
          items: returnItem.items,
          subtotal: returnSubtotal,
          cgst: returnCgst,
          sgst: returnSgst,
          total: returnTotal,
          paymentMethod: returnItem.refundMethod || 'cash'
        },
        businessName: 'ForkFlow',
        businessAddress: '123 Food Street, Bangalore, Karnataka 560001',
        gstNumber: 'GSTIN29ABCDE1234F1Z5',
        contactNumber: '+91 80 1234 5678',
        email: 'contact@millethomefoods.com'
      };
      setCurrentReceipt(receipt);
      setShowReceipt(true);
    }
  };

  const filteredReturns = returns.filter(r =>
    r.items.some(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) ||
    r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Returns Processing">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Input
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          
          {!showForm && (
            <Button
              variant="primary"
              onClick={() => setShowForm(true)}
              disabled={todaysSales.length === 0}
            >
              <ArrowUpCircle size={18} className="mr-1" />
              Process Return
            </Button>
          )}
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Process Sales Return</h2>
            
            {!selectedSale && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Sale to Return
                </label>
                <div className="space-y-2">
                  {todaysSales.length === 0 ? (
                    <p className="text-gray-500">No eligible sales found for today</p>
                  ) : (
                    todaysSales.map(sale => (
                      <button
                        key={sale.id}
                        onClick={() => setSelectedSale(sale.id)}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              Order #{sale.invoiceNumber}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {format(sale.createdAt, 'HH:mm')} - 
                              {sale.items.map(item => ` ${item.quantity}x ${item.name}`).join(', ')}
                            </p>
                          </div>
                          <p className="text-gray-900 font-medium">
                            ₹{sale.total.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedSale && (
              <ReturnForm
                type="sale"
                reference={sales.find(s => s.id === selectedSale)!}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedSale(null);
                }}
              />
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
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Refund Method
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {returnItem.items.map(item => (
                            <div key={item.id}>
                              {item.quantity}x {item.name}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {returnItem.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {returnItem.refundMethod?.toUpperCase() || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ₹{returnItem.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => viewReturnReceipt(returnItem)}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            View Receipt
                          </button>
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

      {showReceipt && currentReceipt && (
        <ReceiptModal
          receipt={currentReceipt}
          onClose={() => {
            setShowReceipt(false);
            setCurrentReceipt(null);
          }}
          onPrint={() => {}} // Print function is now handled internally
          isReturn={true}
        />
      )}
    </DashboardLayout>
  );
};

export default ReturnsPage;