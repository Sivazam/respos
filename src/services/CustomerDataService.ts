import { CustomerData } from '../types';

const CUSTOMER_DATA_KEY = 'customer_data';

export class CustomerDataService {
  // Save or update customer data
  static async upsertCustomerData(
    orderId: string,
    customerData: { name?: string; phone?: string; city?: string },
    source: 'staff' | 'manager' = 'staff',
    timestamp: number = Date.now()
  ): Promise<void> {
    try {
      // Get existing customer data
      const existingData = this.getCustomerData();
      
      // Create or update customer data entry
      const customerEntry: CustomerData = {
        id: orderId, // Use orderId as the document ID for one-to-one mapping
        orderId,
        name: customerData.name || '',
        phone: customerData.phone || '',
        city: customerData.city || '',
        timestamp,
        source
      };

      // Check if entry already exists and update it
      const existingIndex = existingData.findIndex(data => data.orderId === orderId);
      if (existingIndex >= 0) {
        // Update existing entry, preserve original source if it was from staff
        existingData[existingIndex] = {
          ...customerEntry,
          source: existingData[existingIndex].source === 'staff' ? 'staff' : source
        };
      } else {
        // Add new entry
        existingData.push(customerEntry);
      }

      // Save to localStorage
      localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(existingData));
      
      console.log('✅ Customer data saved successfully:', customerEntry);
    } catch (error) {
      console.error('❌ Error saving customer data:', error);
      throw error;
    }
  }

  // Get all customer data
  static getCustomerData(): CustomerData[] {
    try {
      const data = localStorage.getItem(CUSTOMER_DATA_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error reading customer data:', error);
      return [];
    }
  }

  // Get customer data by order ID
  static getCustomerDataByOrderId(orderId: string): CustomerData | null {
    try {
      const allData = this.getCustomerData();
      return allData.find(data => data.orderId === orderId) || null;
    } catch (error) {
      console.error('❌ Error getting customer data by order ID:', error);
      return null;
    }
  }

  // Get customer data by date range
  static getCustomerDataByDateRange(startDate: Date, endDate: Date): CustomerData[] {
    try {
      const allData = this.getCustomerData();
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      return allData.filter(data => 
        data.timestamp >= startTime && data.timestamp <= endTime
      );
    } catch (error) {
      console.error('❌ Error getting customer data by date range:', error);
      return [];
    }
  }

  // Get customer data for today
  static getTodayCustomerData(): CustomerData[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    return this.getCustomerDataByDateRange(startOfDay, endOfDay);
  }

  // Delete customer data by order ID
  static async deleteCustomerDataByOrderId(orderId: string): Promise<void> {
    try {
      const allData = this.getCustomerData();
      const filteredData = allData.filter(data => data.orderId !== orderId);
      localStorage.setItem(CUSTOMER_DATA_KEY, JSON.stringify(filteredData));
      
      console.log('✅ Customer data deleted successfully for order:', orderId);
    } catch (error) {
      console.error('❌ Error deleting customer data:', error);
      throw error;
    }
  }

  // Export customer data as CSV
  static exportToCSV(customerData: CustomerData[]): string {
    const headers = ['Date', 'Name', 'Phone number', 'City', 'Timestamp'];
    
    const rows = customerData.map(data => {
      const date = new Date(data.timestamp).toLocaleString();
      const name = `"${(data.name || '').replace(/"/g, '""')}"`;
      const phone = `"${(data.phone || '').replace(/"/g, '""')}"`;
      const city = `"${(data.city || '').replace(/"/g, '""')}"`;
      
      return [date, name, phone, city, data.timestamp].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // Download CSV file
  static downloadCSV(customerData: CustomerData[], filename?: string): void {
    try {
      const csv = this.exportToCSV(customerData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const defaultFilename = `userbase_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename || defaultFilename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('✅ CSV downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading CSV:', error);
      throw error;
    }
  }
}

export default CustomerDataService;