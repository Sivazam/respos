'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Eye, Receipt } from 'lucide-react';
import Button from '../ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Order } from '@/types/pos';
import { useDebounce, useRenderPerformance } from '@/hooks/usePerformanceOptimization';

interface OptimizedOrderListProps {
  orders: Order[];
  onViewOrder: (order: Order) => void;
  onPrintReceipt: (order: Order) => void;
}

// Order status configuration
const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
} as const;

// Payment method configuration
const PAYMENT_METHOD_CONFIG = {
  cash: { label: 'Cash', icon: '💵' },
  card: { label: 'Card', icon: '💳' },
  mobile: { label: 'Mobile', icon: '📱' }
} as const;

// Order card component
const OrderCard = ({ 
  order, 
  onView, 
  onPrint 
}: { 
  order: Order; 
  onView: () => void; 
  onPrint: () => void; 
}) => {
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const paymentConfig = PAYMENT_METHOD_CONFIG[order.paymentMethod];
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleString('en-US')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline">
              {paymentConfig.icon} {paymentConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Table</span>
            <span className="font-medium">{order.tableNumber}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Items</span>
            <span className="font-medium">{order.items.length} items</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-primary">
              ₹{order.totalAmount.toFixed(2)}
            </span>
          </div>
          
          {order.customerName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onPrint}
              className="flex-1"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function OptimizedOrderList({ 
  orders, 
  onViewOrder, 
  onPrintReceipt 
}: OptimizedOrderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  
  useRenderPerformance('OptimizedOrderList');
  
  // Debounced search
  const debouncedSearch = useDebounce((term: string) => {
    setSearchTerm(term);
  }, 300);
  
  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.paymentMethod === paymentFilter);
    }
    
    // Sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'orderNumber':
          return a.orderNumber.localeCompare(b.orderNumber);
        default:
          return 0;
      }
    });
  }, [orders, searchTerm, statusFilter, paymentFilter, sortBy]);
  
  // Statistics
  const statistics = useMemo(() => {
    const total = filteredAndSortedOrders.length;
    const completed = filteredAndSortedOrders.filter(o => o.status === 'completed').length;
    const pending = filteredAndSortedOrders.filter(o => o.status === 'pending').length;
    const cancelled = filteredAndSortedOrders.filter(o => o.status === 'cancelled').length;
    const totalRevenue = filteredAndSortedOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    return { total, completed, pending, cancelled, totalRevenue };
  }, [filteredAndSortedOrders]);
  
  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search and Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search order number, customer name or table..."
              className="pl-10"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">By Time</SelectItem>
                <SelectItem value="amount">By Amount</SelectItem>
                <SelectItem value="orderNumber">By Order Number</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPaymentFilter('all');
                setSortBy('date');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{statistics.total}</div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statistics.cancelled}</div>
            <div className="text-sm text-muted-foreground">Cancelled</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              ₹{statistics.totalRevenue.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Order List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Order List ({filteredAndSortedOrders.length})
          </h3>
        </div>
        
        {filteredAndSortedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                  ? 'No orders found matching your criteria'
                  : 'No orders yet'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onView={() => onViewOrder(order)}
                onPrint={() => onPrintReceipt(order)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedOrderList;