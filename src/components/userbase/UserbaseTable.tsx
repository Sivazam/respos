import React from 'react';
import { CustomerData } from '../../contexts/CustomerDataService';
import { Card } from '../ui/card';
import { Download, Calendar, User, Phone, MapPin } from 'lucide-react';

interface UserbaseTableProps {
  data: CustomerData[];
  onExportCSV: () => void;
  isLoading?: boolean;
}

const UserbaseTable: React.FC<UserbaseTableProps> = ({
  data,
  onExportCSV,
  isLoading = false
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading customer data...</span>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No customer data found</h3>
        <p className="text-gray-500">
          No customer information collected for the selected date range.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Data</h3>
          <p className="text-sm text-gray-500">
            {data.length} customers found
          </p>
        </div>
        
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    Date
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    Name
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    Phone
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    City
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  Source
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-900 border-b">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((customer, index) => (
                <tr key={customer.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {formatDate(customer.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {customer.name || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {customer.phone || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {customer.city || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      customer.source === 'staff'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {customer.source === 'staff' ? 'Staff' : 'Manager'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDateTime(customer.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Total Customers</p>
            <p className="font-semibold text-gray-900">{data.length}</p>
          </div>
          <div>
            <p className="text-gray-500">With Phone</p>
            <p className="font-semibold text-gray-900">
              {data.filter(c => c.phone).length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">With Email</p>
            <p className="font-semibold text-gray-900">
              {data.filter(c => c.name).length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">With City</p>
            <p className="font-semibold text-gray-900">
              {data.filter(c => c.city).length}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserbaseTable;