
import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Order, Product } from '@/types/pos';
import { useRenderPerformance, useCache } from '@/hooks/usePerformanceOptimization';

interface OptimizedDashboardProps {
  orders: Order[];
  products: Product[];
  storeId: string;
}

interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

export function OptimizedDashboard({ orders, products, storeId }: OptimizedDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  useRenderPerformance('OptimizedDashboard');
  
  // Cache statistics calculation
  const { data: statistics, loading } = useCache(
    `dashboard-stats-${storeId}-${selectedPeriod}`,
    async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let startDate: Date;
      switch (selectedPeriod) {
        case 'today':
          startDate = today;
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      
      const filteredOrders = orders.filter(order => 
        new Date(order.createdAt) >= startDate
      );
      
      const totalRevenue = filteredOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.totalAmount, 0);
      
      const totalOrders = filteredOrders.length;
      const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
      
      // Popular products
      const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
      
      filteredOrders.forEach(order => {
        if (order.status === 'completed') {
          order.items.forEach(item => {
            const existing = productSales.get(item.product.id) || {
              name: item.product.name,
              quantity: 0,
              revenue: 0
            };
            existing.quantity += item.quantity;
            existing.revenue += item.product.price * item.quantity;
            productSales.set(item.product.id, existing);
          });
        }
      });
      
      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      // Low stock alert
      const lowStockProducts = products
        .filter(p => p.stock < 10)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
      
      // Hourly statistics
      const hourlyStats = new Map<number, { orders: number; revenue: number }>();
      
      filteredOrders.forEach(order => {
        if (order.status === 'completed') {
          const hour = new Date(order.createdAt).getHours();
          const existing = hourlyStats.get(hour) || { orders: 0, revenue: 0 };
          existing.orders += 1;
          existing.revenue += order.totalAmount;
          hourlyStats.set(hour, existing);
        }
      });
      
      return {
        totalRevenue,
        totalOrders,
        completedOrders,
        averageOrderValue,
        topProducts,
        lowStockProducts,
        hourlyStats: Array.from(hourlyStats.entries())
          .map(([hour, stats]) => ({ hour, ...stats }))
          .sort((a, b) => a.hour - b.hour)
      };
    },
    30 * 1000 // 30 seconds cache
  );
  
  // Statistics card data
  const statCards: StatCard[] = useMemo(() => {
    if (!statistics) return [];
    
    return [
      {
        title: 'Total Revenue',
        value: `₹${statistics.totalRevenue.toFixed(2)}`,
        change: 12.5,
        changeType: 'increase',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'text-green-600'
      },
      {
        title: 'Total Orders',
        value: statistics.totalOrders,
        change: 8.2,
        changeType: 'increase',
        icon: <ShoppingCart className="h-5 w-5" />,
        color: 'text-blue-600'
      },
      {
        title: 'Completion Rate',
        value: `${statistics.totalOrders > 0 ? Math.round((statistics.completedOrders / statistics.totalOrders) * 100) : 0}%`,
        change: 3.1,
        changeType: 'increase',
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-purple-600'
      },
      {
        title: 'Average Order Value',
        value: `₹${statistics.averageOrderValue.toFixed(2)}`,
        change: -2.4,
        changeType: 'decrease',
        icon: <Users className="h-5 w-5" />,
        color: 'text-orange-600'
      }
    ];
  }, [statistics]);
  
  // Render statistics card
  const renderStatCard = useCallback((card: StatCard) => (
    <Card key={card.title}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <div className={card.color}>{card.icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{card.value}</div>
        {card.change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {card.changeType === 'increase' ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            <span className={card.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(card.change)}%
            </span>
            <span className="ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  ), []);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (!statistics) return null;
  
  return (
    <div className="space-y-6">
      {/* Time Period Selection */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map(renderStatCard)}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Popular Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Popular Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.topProducts.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No sales data yet
                </div>
              ) : (
                statistics.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Sales: {product.quantity} | Revenue: ₹{product.revenue.toFixed(2)}
                      </div>
                    </div>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.lowStockProducts.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  Stock levels are sufficient
                </div>
              ) : (
                statistics.lowStockProducts.map(product => (
                  <div key={product.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {product.stock} {product.unit} remaining
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((product.stock / 10) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Hourly Sales Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Sales Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statistics.hourlyStats.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No hourly data yet
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {statistics.hourlyStats.map(stat => (
                  <div key={stat.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium w-12">
                        {stat.hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="flex-1">
                        <Progress 
                          value={Math.min((stat.orders / Math.max(...statistics.hourlyStats.map(s => s.orders))) * 100, 100)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.orders} orders | ₹{stat.revenue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}