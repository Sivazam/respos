import React, { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { BarChart, FileText, Download, Calendar, Calculator } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useSales } from '../../contexts/SalesContext';
import { useReturns } from '../../contexts/ReturnContext';
import { usePurchases } from '../../contexts/PurchaseContext';
import { useFeatures } from '../../hooks/useFeatures';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';

const SuperAdminSalesReportPage: React.FC = () => {
  const { sales, loading, error } = useSales();
  const { returns } = useReturns();
  const { purchases } = usePurchases();
  const { features } = useFeatures();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const dateRanges = [
    {
      label: 'Today',
      getRange: () => ({
        start: format(startOfDay(new Date()), 'yyyy-MM-dd'),
        end: format(endOfDay(new Date()), 'yyyy-MM-dd')
      })
    },
    {
      label: 'Last 7 Days',
      getRange: () => ({
        start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Week',
      getRange: () => ({
        start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Month',
      getRange: () => ({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      })
    },
    {
      label: 'This Year',
      getRange: () => ({
        start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
        end: format(endOfYear(new Date()), 'yyyy-MM-dd')
      })
    }
  ];

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = sale.createdAt;
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    if (!features.canProcessReturns()) return [];
    
    return returns.filter(ret => {
      const returnDate = ret.createdAt;
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      return ret.type === 'sale' && returnDate >= start && returnDate <= end;
    });
  }, [returns, startDate, endDate, features]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const purchaseDate = purchase.createdAt;
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      
      return purchaseDate >= start && purchaseDate <= end;
    });
  }, [purchases, startDate, endDate]);

  const summary = useMemo(() => {
    const grossSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalReturns = features.canProcessReturns() 
      ? filteredReturns.reduce((sum, ret) => sum + ret.total, 0)
      : 0;
    const netSales = grossSales - totalReturns;
    
    const grossTransactions = filteredSales.length;
    const returnTransactions = features.canProcessReturns() ? filteredReturns.length : 0;
    const netTransactions = grossTransactions - returnTransactions;
    
    const grossItems = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    const returnedItems = features.canProcessReturns()
      ? filteredReturns.reduce((sum, ret) =>
          sum + ret.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
      : 0;
    const netItems = grossItems - returnedItems;

    const paymentMethods = filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Subtract returns from payment methods only if returns are enabled
    if (features.canProcessReturns()) {
      filteredReturns.forEach(ret => {
        if (ret.refundMethod) {
          paymentMethods[ret.refundMethod] = (paymentMethods[ret.refundMethod] || 0) - ret.total;
        }
      });
    }

    return {
      grossSales,
      totalReturns,
      netSales,
      grossTransactions,
      returnTransactions,
      netTransactions,
      grossItems,
      returnedItems,
      netItems,
      paymentMethods
    };
  }, [filteredSales, filteredReturns, features]);

  const handleDateRangeSelect = (range: { start: string; end: string }) => {
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const downloadReport = () => {
    const headers = ['Date', 'Type', 'Invoice', 'Items', 'Payment Method', 'Amount'];
    
    // Combine sales and returns for the report (only if returns are enabled)
    const allTransactions = [
      ...filteredSales.map(sale => [
        format(sale.createdAt, 'dd/MM/yyyy HH:mm'),
        'Sale',
        sale.invoiceNumber,
        sale.items.reduce((sum, item) => sum + item.quantity, 0),
        sale.paymentMethod.toUpperCase(),
        `₹${sale.total.toFixed(2)}`
      ]),
      ...(features.canProcessReturns() ? filteredReturns.map(ret => [
        format(ret.createdAt, 'dd/MM/yyyy HH:mm'),
        'Return',
        ret.referenceId.slice(0, 8),
        ret.items.reduce((sum, item) => sum + item.quantity, 0),
        (ret.refundMethod || 'CASH').toUpperCase(),
        `-₹${ret.total.toFixed(2)}`
      ]) : [])
    ].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    // Add summary rows
    const summaryRows = [
      ['', '', '', '', '', ''],
      ['SUMMARY', '', '', '', '', ''],
      ['Gross Sales', '', '', summary.grossTransactions, '', `₹${summary.grossSales.toFixed(2)}`],
      ...(features.canProcessReturns() ? [
        ['Returns', '', '', summary.returnTransactions, '', `-₹${summary.totalReturns.toFixed(2)}`],
        ['Net Sales', '', '', summary.netTransactions, '', `₹${summary.netSales.toFixed(2)}`]
      ] : []),
      [features.canProcessReturns() ? 'Net Items Sold' : 'Total Items Sold', '', '', summary.netItems, '', '']
    ];

    const csv = [
      headers.join(','),
      ...allTransactions.map(row => row.join(',')),
      ...summaryRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Sales Report">
      <div className="space-y-4 sm:space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Date Range Selection */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {dateRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleDateRangeSelect(range.getRange())}
                  className="px-3 py-2 rounded-full text-xs sm:text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={<Calendar size={18} className="text-gray-500" />}
              />
              <Input
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                icon={<Calendar size={18} className="text-gray-500" />}
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {features.canProcessReturns() ? 'Net Sales' : 'Total Sales'}
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  ₹{summary.netSales.toFixed(2)}
                </h3>
                {features.canProcessReturns() && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Gross: ₹{summary.grossSales.toFixed(2)} | Returns: ₹{summary.totalReturns.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {features.canProcessReturns() ? 'Net Transactions' : 'Total Transactions'}
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {summary.netTransactions}
                </h3>
                {features.canProcessReturns() && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Sales: {summary.grossTransactions} | Returns: {summary.returnTransactions}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-amber-100 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {features.canProcessReturns() ? 'Net Items Sold' : 'Total Items Sold'}
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {summary.netItems}
                </h3>
                {features.canProcessReturns() && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Sold: {summary.grossItems} | Returned: {summary.returnedItems}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Avg. {features.canProcessReturns() ? 'Net' : 'Total'} Sale
                </p>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  ₹{(summary.netSales / (summary.netTransactions || 1)).toFixed(2)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Per transaction
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Combined Sales and Returns Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      Loading data...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 && filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">
                      No transactions found for the selected date range
                    </td>
                  </tr>
                ) : (
                  // Combine and sort sales and returns (only if returns are enabled)
                  [...filteredSales.map(sale => ({ ...sale, type: 'sale' as const })),
                   ...(features.canProcessReturns() ? filteredReturns.map(ret => ({ ...ret, type: 'return' as const })) : [])]
                    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                    .map(transaction => (
                      <tr key={transaction.id} className={transaction.type === 'return' ? 'bg-red-50' : ''}>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <span className="hidden sm:inline">{format(transaction.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                          <span className="sm:hidden">{format(transaction.createdAt, 'dd/MM HH:mm')}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'sale'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type === 'sale' ? 'Sale' : 'Return'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                          <span className="hidden sm:inline">
                            {transaction.type === 'sale' 
                              ? (transaction as any).invoiceNumber
                              : (transaction as any).referenceId?.slice(0, 8)
                            }
                          </span>
                          <span className="sm:hidden">
                            {transaction.type === 'sale' 
                              ? (transaction as any).invoiceNumber?.slice(-4)
                              : (transaction as any).referenceId?.slice(0, 4)
                            }
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {transaction.items.reduce((sum, item) => sum + item.quantity, 0)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <span className="hidden sm:inline">
                            {transaction.type === 'sale'
                              ? (transaction as any).paymentMethod.toUpperCase()
                              : ((transaction as any).refundMethod || 'CASH').toUpperCase()
                            }
                          </span>
                          <span className="sm:hidden">
                            {transaction.type === 'sale'
                              ? (transaction as any).paymentMethod.charAt(0).toUpperCase()
                              : ((transaction as any).refundMethod || 'C').charAt(0).toUpperCase()
                            }
                          </span>
                        </td>
                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-right font-medium ${
                          transaction.type === 'sale' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'sale' ? '+' : '-'}₹{transaction.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminSalesReportPage;