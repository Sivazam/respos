import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Filter, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCustomerData, CustomerData } from '../../contexts/CustomerDataService';
import UserbaseTable from '../../components/userbase/UserbaseTable';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/card';
import toast from 'react-hot-toast';

// Interface for grouped customer data
interface GroupedCustomerData {
  phone: string;
  name: string;
  city: string;
  visitCount: number;
  lastVisit: number;
  paymentMethods: ('cash' | 'card' | 'upi')[];
  sources: ('staff' | 'manager')[];
  franchiseId?: string;
}

const UserbasePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [customerData, setCustomerData] = useState<CustomerData[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Function to group customer data by mobile number
  const groupCustomerData = useCallback((data: CustomerData[]): GroupedCustomerData[] => {
    const customerMap = new Map<string, CustomerData[]>();
    
    // Group by phone number
    data.forEach(customer => {
      const phone = customer.phone || 'unknown';
      if (!customerMap.has(phone)) {
        customerMap.set(phone, []);
      }
      customerMap.get(phone)!.push(customer);
    });

    // Process each group
    const groupedCustomers: GroupedCustomerData[] = [];
    
    customerMap.forEach((customers, phone) => {
      // Sort by timestamp descending to get most recent first
      customers.sort((a, b) => b.timestamp - a.timestamp);
      
      const mostRecent = customers[0];
      const visitCount = customers.length;
      
      // Get unique payment methods and sources
      const paymentMethods = Array.from(new Set(customers.map(c => c.paymentMethod).filter(Boolean))) as ('cash' | 'card' | 'upi')[];
      const sources = Array.from(new Set(customers.map(c => c.source))) as ('staff' | 'manager')[];
      
      groupedCustomers.push({
        phone: phone === 'unknown' ? '' : phone,
        name: mostRecent.name || '',
        city: mostRecent.city || '',
        visitCount,
        lastVisit: mostRecent.timestamp,
        paymentMethods,
        sources,
        franchiseId: mostRecent.franchiseId
      });
    });

    // Sort by visit count descending, then by last visit descending
    return groupedCustomers.sort((a, b) => {
      if (b.visitCount !== a.visitCount) {
        return b.visitCount - a.visitCount;
      }
      return b.lastVisit - a.lastVisit;
    });
  }, []);

  // Set default date range to today
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  const loadCustomerData = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const start = new Date(startDate);
      // Set start to beginning of day
      start.setHours(0, 0, 0, 0);
      
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      console.log('🔍 Loading customer data for range:', {
        start: start.toISOString(),
        end: end.toISOString(),
        startTimestamp: start.getTime(),
        endTimestamp: end.getTime(),
        currentUserFranchiseId: currentUser?.franchiseId,
        userRole: currentUser?.role
      });

      const data = await fetchCustomerData(start.getTime(), end.getTime(), currentUser?.franchiseId);
      setCustomerData(data);
      
      // Process grouped data
      const grouped = groupCustomerData(data);
      setGroupedData(grouped);
      
      console.log(`✅ Loaded ${data.length} customer records, grouped into ${grouped.length} unique customers`);
      
      // Debug: Log first few records to understand the data structure
      if (data.length > 0) {
        console.log('📋 Sample records:', data.slice(0, 3).map(record => ({
          orderId: record.orderId,
          name: record.name,
          phone: record.phone,
          city: record.city,
          timestamp: record.timestamp,
          date: record.date,
          franchiseId: record.franchiseId,
          readableDate: new Date(record.timestamp).toLocaleString()
        })));
      }
      
      // Debug: Log grouped data
      if (grouped.length > 0) {
        console.log('👥 Sample grouped customers:', grouped.slice(0, 3).map(customer => ({
          phone: customer.phone,
          name: customer.name,
          city: customer.city,
          visitCount: customer.visitCount,
          lastVisit: new Date(customer.lastVisit).toLocaleString()
        })));
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, currentUser?.franchiseId, groupCustomerData]);

  // Load customer data when date range changes
  useEffect(() => {
    if (startDate && endDate) {
      loadCustomerData();
    }
  }, [startDate, endDate, loadCustomerData]);

  const handleExportCSV = () => {
    if (groupedData.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Filter users with phone numbers only
    const filteredData = groupedData.filter(data => data.phone && data.phone.trim() !== '');
    
    if (filteredData.length === 0) {
      toast.error('No users with phone numbers found to export');
      return;
    }

    // Debug: Log date range and data count
    console.log('📊 Exporting CSV with date range:', {
      startDate: new Date(startDate).toLocaleDateString(),
      endDate: new Date(endDate).toLocaleDateString(),
      totalUniqueCustomers: groupedData.length,
      uniqueCustomersWithPhone: filteredData.length,
      totalVisits: groupedData.reduce((sum, c) => sum + c.visitCount, 0)
    });

    setIsExporting(true);
    try {
      const startDateStr = new Date(startDate).toLocaleDateString('en-IN').replace(/\//g, '-');
      const endDateStr = new Date(endDate).toLocaleDateString('en-IN').replace(/\//g, '-');
      const filename = `userbase_frequency_${startDateStr}_to_${endDateStr}.csv`;
      
      // Create CSV content - Name, Phone Number, City, Visit Count, Last Visit
      const headers = ['Name', 'Phone Number', 'City', 'Visit Count', 'Last Visit'];
      const rows = filteredData.map(data => {
        const name = `"${(data.name || '').replace(/"/g, '""')}"`;
        const phone = `"${(data.phone || '').replace(/"/g, '""')}"`;
        const city = `"${(data.city || '').replace(/"/g, '""')}"`;
        const visitCount = data.visitCount.toString();
        const lastVisit = `"${new Date(data.lastVisit).toLocaleDateString('en-IN')}"`;
        
        return [name, phone, city, visitCount, lastVisit].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Debug: Log export summary
      console.log('📋 Export summary:', {
        filename,
        headers: headers.length,
        rows: rows.length,
        skippedRecords: groupedData.length - filteredData.length,
        fileSize: `${(new Blob([csvContent]).size / 1024).toFixed(2)} KB`
      });
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported ${rows.length} unique customer records`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    loadCustomerData();
  };

  const handleQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Check if user has permission to access this page
  const hasPermission = currentUser?.role && 
    ['manager', 'admin', 'owner', 'superadmin'].includes(currentUser.role);

  if (!hasPermission) {
    return (
      <DashboardLayout title="Userbase">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You don't have permission to access the userbase.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Userbase">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Customers</p>
                <p className="text-2xl font-bold">{groupedData.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With Phone</p>
                <p className="text-2xl font-bold text-green-600">
                  {groupedData.filter(c => c.phone).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold text-purple-600">
                  {groupedData.reduce((sum, c) => sum + c.visitCount, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Date Range Filter</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Date Inputs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick Date Range Buttons - Separate Row for Better Responsiveness */}
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(0)}
                disabled={loading}
                className="flex-1 min-w-[100px]"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(7)}
                disabled={loading}
                className="flex-1 min-w-[100px]"
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(30)}
                disabled={loading}
                className="flex-1 min-w-[100px]"
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Set a very wide date range to catch all data
                  const start = new Date();
                  start.setFullYear(start.getFullYear() - 1); // 1 year ago
                  const end = new Date();
                  end.setFullYear(end.getFullYear() + 1); // 1 year in future
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              >
                All Time
              </Button>
            </div>
          </div>
        </Card>

        {/* Customer Data Table */}
        <UserbaseTable
          data={groupedData}
          onExportCSV={handleExportCSV}
          isLoading={loading}
        />

        {/* Export Loading Overlay */}
        {isExporting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="text-gray-700">Exporting customer data...</span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserbasePage;