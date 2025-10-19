import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useOrders } from '../../contexts/OrderContext';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
import { useLocations } from '../../contexts/LocationContext';
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useOrderMilestoneCelebration } from '../../hooks/useOrderMilestoneCelebration';
import { useOrderCount } from '../../contexts/OrderCountContext';
import { startOfDay, endOfDay } from 'date-fns';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Table,
  Calendar,
  TrendingUp,
  CreditCard,
  Smartphone,
  Users,
  BarChart3,
  Package
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/db';
import Input from '../../components/ui/Input';
import StartOrderButton from '../../components/order/StartOrderButton';
import ApprovalStatusBanner from '../../components/ui/ApprovalStatusBanner';
import { Card } from '../../components/ui/card';
import SimpleConfetti from '../../components/ui/SimpleConfetti';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ManagerDashboard: React.FC = () => {
  const { orders } = useOrders();
  const { temporaryOrders } = useTemporaryOrdersDisplay();
  const { currentLocation } = useLocations();
  const { tables } = useTables();
  const { currentUser } = useAuth();
  const { setTotalOrders } = useOrderCount();
  const { menuItems } = useMenuItems();
  const { shouldShowConfetti, handleConfettiComplete, stats: milestoneStats, triggerMilestone, isMilestoneReached } = useOrderMilestoneCelebration();
  const [showMilestoneBanner, setShowMilestoneBanner] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [completedOrders, setCompletedOrders] = useState<unknown[]>([]);
  
  // Check if manager has full access (approved + assigned location)
  const hasFullAccess = currentUser?.isApproved && currentUser?.locationId && currentUser?.isActive;
  
  // Auto-dismiss milestone banner after 5 seconds
  useEffect(() => {
    if (isMilestoneReached) {
      setShowMilestoneBanner(true);
      const timer = setTimeout(() => {
        setShowMilestoneBanner(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isMilestoneReached]);
  
  // Load completed orders on mount
  React.useEffect(() => {
    const loadOrders = async () => {
      try {
        
        // Source 1: Load from localStorage (user-specific)
        const completedOrdersKey = `completed_orders_${currentUser?.uid}`;
        const existingOrders = JSON.parse(localStorage.getItem(completedOrdersKey) || '[]');
        
        // Source 2: Load location-based completed orders
        const locationCompletedOrdersKey = `completed_orders_${currentUser?.locationId}`;
        const locationOrders = JSON.parse(localStorage.getItem(locationCompletedOrdersKey) || '[]');
        
        // Source 3: Load admin completed orders
        const adminCompletedOrdersKey = `completed_orders_admin`;
        const adminOrders = JSON.parse(localStorage.getItem(adminCompletedOrdersKey) || '[]');
        
        // Source 4: Load owner completed orders
        const ownerCompletedOrdersKey = `completed_orders_owner`;
        const ownerOrders = JSON.parse(localStorage.getItem(ownerCompletedOrdersKey) || '[]');
        
        // Source 5: Load from sales localStorage
        const salesKey = `sales_${currentUser?.locationId || 'default'}`;
        const salesOrders = JSON.parse(localStorage.getItem(salesKey) || '[]');
        
        // Source 6: Load from general sales
        const generalSalesKey = 'sales';
        const generalSales = JSON.parse(localStorage.getItem(generalSalesKey) || '[]');
        
        // Source 7: Load from Firestore
        let firestoreOrders: unknown[] = [];
        if (currentUser?.locationId) {
          try {
            const ordersQuery = query(
              collection(db, 'orders'),
              where('locationId', '==', currentUser.locationId)
            );
            
            const querySnapshot = await getDocs(ordersQuery);
            firestoreOrders = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                orderNumber: data.orderNumber,
                tableIds: data.tableIds || [],
                tableNames: data.tableNames || [],
                items: data.items || [],
                totalAmount: data.totalAmount || data.total || 0,
                status: data.status,
                orderType: data.orderType || 'dinein',
                orderMode: data.orderMode,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                settledAt: data.completedAt?.toDate?.() || data.settledAt?.toDate?.() || data.createdAt,
                staffId: data.staffId,
                paymentMethod: data.paymentData?.paymentMethod || data.paymentMethod || 'cash',
                paymentData: data.paymentData,
                customerName: data.customerName,
                notes: data.notes
              };
            }).filter(order => ['completed', 'settled'].includes(order.status));
          } catch (firestoreError) {
            console.error('Error loading from Firestore:', firestoreError);
          }
        }
        
        // Combine all sources
        const combinedOrders = [
          ...existingOrders,
          ...locationOrders, 
          ...adminOrders, 
          ...ownerOrders,
          ...salesOrders.map(sale => ({
            id: sale.id,
            orderNumber: sale.invoiceNumber,
            tableIds: sale.tableNames || [],
            tableNames: sale.tableNames || [],
            items: sale.items || [],
            totalAmount: sale.total || 0,
            status: 'settled',
            orderType: sale.orderType || 'dinein',
            orderMode: sale.orderMode,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            settledAt: sale.createdAt,
            staffId: sale.staffId,
            paymentMethod: sale.paymentMethod || 'cash'
          })),
          ...generalSales.map(sale => ({
            id: sale.id,
            orderNumber: sale.invoiceNumber,
            tableIds: sale.tableNames || [],
            tableNames: sale.tableNames || [],
            items: sale.items || [],
            totalAmount: sale.total || 0,
            status: 'settled',
            orderType: sale.orderType || 'dinein',
            orderMode: sale.orderMode,
            createdAt: sale.createdAt,
            updatedAt: sale.updatedAt,
            settledAt: sale.createdAt,
            staffId: sale.staffId,
            paymentMethod: sale.paymentMethod || 'cash'
          })),
          ...firestoreOrders
        ];
        
        // Remove duplicates
        const uniqueOrders = combinedOrders.filter((order, index, self) => 
          index === self.findIndex((o) => o.id === order.id)
        );
        
        setCompletedOrders(uniqueOrders);
      } catch (error) {
        console.error('Failed to load completed orders:', error);
      }
    };
    
    loadOrders();
  }, [currentUser?.uid, currentUser?.locationId]);
  
  // Get today's orders for active orders
  const today = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return { start, end };
  }, []);
  
  // Filter orders based on date range and location
  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter(order => {
      const orderDate = new Date(order.settledAt).toISOString().split('T')[0];
      const matchesDateRange = orderDate >= startDate && orderDate <= endDate;
      const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
      return matchesDateRange && matchesLocation;
    });
  }, [completedOrders, startDate, endDate, selectedLocationId]);

  const todaysOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      const isToday = orderDate >= today.start && orderDate <= today.end;
      
      // Filter by location if specified
      const matchesLocation = selectedLocationId === 'all' || order.locationId === selectedLocationId;
      
      return isToday && matchesLocation;
    });
  }, [orders, today, selectedLocationId]);

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredCompletedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = filteredCompletedOrders.length;
    
    // Update the shared order count for milestone celebration
    setTotalOrders(totalOrders);
    
    // Payment method breakdown
    const upiOrders = filteredCompletedOrders.filter(order => order.paymentMethod === 'upi');
    const cashOrders = filteredCompletedOrders.filter(order => order.paymentMethod === 'cash');
    const cardOrders = filteredCompletedOrders.filter(order => order.paymentMethod === 'card');
    
    const upiRevenue = upiOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const cashRevenue = cashOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const cardRevenue = cardOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Order type breakdown
    const dineInOrders = filteredCompletedOrders.filter(order => order.orderType === 'dinein');
    const deliveryOrders = filteredCompletedOrders.filter(order => order.orderType === 'delivery');
    
    // Item sales analysis
    const itemSales: { [key: string]: number } = {};
    const itemDetails: { [key: string]: { image?: string; itemId?: string } } = {};
    
    // Create a lookup map for faster menu item matching
    const menuItemLookup = new Map<string, MenuItem>();
    menuItems.forEach(item => {
      menuItemLookup.set(item.id, item);
      menuItemLookup.set(item.name.toLowerCase(), item);
      menuItemLookup.set(item.name, item);
    });
    
    filteredCompletedOrders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: unknown) => {
          const itemData = item as { 
            name?: string; 
            itemName?: string; 
            quantity?: number;
            id?: string;
            itemId?: string;
            menuItemId?: string;
            image?: string;
          };
          const itemName = itemData.name || itemData.itemName || 'Unknown Item';
          const quantity = itemData.quantity || 1;
          const itemId = itemData.id || itemData.itemId || itemData.menuItemId;
          
          itemSales[itemName] = (itemSales[itemName] || 0) + quantity;
          
          // Store item details (image and itemId) if not already stored
          if (!itemDetails[itemName]) {
            // Enhanced menu item matching using lookup map
            let menuItem = menuItemLookup.get(itemId || '') ||
                           menuItemLookup.get(itemName) ||
                           menuItemLookup.get(itemName.toLowerCase());
            
            // If still not found, try partial matching
            if (!menuItem) {
              menuItem = menuItems.find(mi => {
                const itemWords = itemName.toLowerCase().split(' ');
                const menuWords = mi.name.toLowerCase().split(' ');
                return itemWords.some((word: string) => word.length > 2 && menuWords.some((menuWord: string) => menuWord.includes(word)));
              });
            }
            
            // Get the image URL from menu item
            const imageUrl = menuItem?.imageUrl;
            
            // If no image exists, we'll handle this in the UI with a styled fallback
            // Instead of using random placeholder images, we'll show a branded fallback
            
            itemDetails[itemName] = {
              image: imageUrl,
              itemId: itemId || menuItem?.id
            };
          }
        });
      }
    });
    
    // Sort items by quantity sold and take only top 3
    const topItems = Object.entries(itemSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, quantity]) => ({ 
        name, 
        quantity,
        image: itemDetails[name]?.image,
        itemId: itemDetails[name]?.itemId,
        percentage: 0 // Will be calculated below
      }));
    
    // Calculate percentages for top items
    const totalTopItemsQuantity = topItems.reduce((sum, item) => sum + item.quantity, 0);
    topItems.forEach(item => {
      item.percentage = totalTopItemsQuantity > 0 ? (item.quantity / totalTopItemsQuantity) * 100 : 0;
    });
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Peak hours analysis
    const hourSales: { [hour: string]: number } = {};
    filteredCompletedOrders.forEach(order => {
      const hour = new Date(order.settledAt).getHours();
      const hourKey = `${hour}:00`;
      hourSales[hourKey] = (hourSales[hourKey] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([hour, count]) => ({ hour, count }));
    
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      upiRevenue: upiRevenue,
      cashRevenue: cashRevenue,
      cardRevenue: cardRevenue,
      upiOrders: upiOrders.length,
      cashOrders: cashOrders.length,
      cardOrders: cardOrders.length,
      dineInOrders: dineInOrders.length,
      deliveryOrders: deliveryOrders.length,
      topItems,
      peakHours,
      paymentBreakdown: {
        upi: { revenue: upiRevenue, count: upiOrders.length },
        cash: { revenue: cashRevenue, count: cashOrders.length },
        card: { revenue: cardRevenue, count: cardOrders.length }
      }
    };
  }, [filteredCompletedOrders, setTotalOrders]);
  
  // Active orders metrics (for today)
  const temporaryOrdersCount = temporaryOrders.length;
  const readyOrders = todaysOrders.filter(order => order.status === 'ready').length;
  const completedTodayOrders = todaysOrders.filter(order => order.status === 'completed').length;
  
  // Table-specific metrics
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;
  const totalTables = tables.length;
  const tableOccupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;
  
  // Order type breakdown for active orders
  // (kept for potential future use)
  // const dineInActiveOrders = todaysOrders.filter(order => order.orderType === 'dinein').length;
  // const takeawayActiveOrders = todaysOrders.filter(order => order.orderType === 'takeaway' || order.orderType === 'delivery').length;

  // Chart configurations
  const paymentChartData = {
    labels: ['UPI', 'Cash', 'Card'],
    datasets: [
      {
        label: 'Revenue by Payment Method',
        data: [metrics.upiRevenue, metrics.cashRevenue, metrics.cardRevenue],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const peakHoursChartData = {
    labels: metrics.peakHours.map(item => item.hour),
    datasets: [
      {
        label: 'Orders by Hour',
        data: metrics.peakHours.map(item => item.count),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderColor: 'rgba(251, 146, 60, 1)',
        borderWidth: 1,
      },
    ],
  };

  const orderTypeChartData = {
    labels: ['Dine-in', 'Delivery'],
    datasets: [
      {
        label: 'Orders by Type',
        data: [metrics.dineInOrders, metrics.deliveryOrders],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(147, 51, 234, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        padding: 8,
        cornerRadius: 4
      }
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  // Pie chart options
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        titleFont: {
          size: 12
        },
        bodyFont: {
          size: 11
        },
        padding: 8,
        cornerRadius: 4,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <>
      {/* Celebration Confetti */}
      <SimpleConfetti 
        isActive={shouldShowConfetti} 
        onComplete={handleConfettiComplete}
      />
      
      {/* Milestone Celebration Block */}
      {showMilestoneBanner && (
        <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white p-6 rounded-lg mb-6 text-center shadow-lg animate-pulse transition-all duration-500 ease-in-out transform">
          <div className="text-2xl font-bold mb-2">🎉 MILESTONE ACHIEVED! 🎉</div>
          <div className="text-lg">
            Congratulations! You've reached {milestoneStats.totalCompletedOrders} completed orders!
          </div>
          <div className="text-sm mt-2 opacity-90">
            Next milestone: {milestoneStats.nextMilestone} orders
          </div>
        </div>
      )}
      
      <style jsx>{`
        .float-hover {
          transition: all 0.3s ease;
        }
        .float-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        /* Mobile-specific adjustments */
        @media (max-width: 640px) {
          .float-hover:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
          }
        }
      `}</style>
      <DashboardLayout title="Manager Dashboard">
        {/* Approval Status Banner */}
        <ApprovalStatusBanner 
          currentUser={currentUser} 
          onRefresh={() => window.location.reload()} 
        />
        
        <div className="space-y-6">
          {/* Date Range and Location Filter */}
          <div className="bg-white shadow rounded-lg p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Analytics Period Info */}
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900">Analytics Period</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {startDate === endDate ? `Today (${startDate})` : `${startDate} to ${endDate}`}
                  </p>
                </div>
              </div>
              
              {/* Date Controls Only - Location dropdown hidden */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs sm:text-sm w-full sm:flex-1"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs sm:text-sm w-full sm:flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Revenue Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Total Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                    ₹{metrics.totalRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Avg: ₹{metrics.avgOrderValue.toFixed(0)} per order
                  </p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Total Orders</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">{metrics.totalOrders}</p>
                  <p className="text-xs text-gray-400 truncate">
                    Dine-in: {metrics.dineInOrders}, Delivery: {metrics.deliveryOrders}
                  </p>
                </div>
                <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">UPI Payments</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600 truncate">
                    ₹{metrics.upiRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{metrics.upiOrders} transactions</p>
                </div>
                <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Cash Payments</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                    ₹{metrics.cashRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{metrics.cashOrders} transactions</p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </Card>
          </div>

          {/* Additional Payment Method Card */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <Card className="p-3 sm:p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Card Payments</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                    ₹{metrics.cardRevenue.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{metrics.cardOrders} transactions</p>
                </div>
                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </Card>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Selling Items */}
            <Card className="p-3 sm:p-4 md:p-6">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Top Selling Items</span>
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {metrics.topItems.length > 0 ? (
                  metrics.topItems.map((item) => (
                    <div key={item.itemId || item.name} className="space-y-2">
                      {/* Item Name and Quantity */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.name}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {item.quantity} sold
                        </span>
                      </div>
                      
                      {/* Bar with Image at Start */}
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {/* Item Image */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border-2 border-white shadow-md float-hover">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to branded placeholder if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                        <span class="text-white font-bold text-xs sm:text-sm">${item.name.charAt(0).toUpperCase()}</span>
                                      </div>
                                    `;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                <span className="text-white font-bold text-xs sm:text-sm">{item.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="flex-1 min-w-0">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 sm:h-8 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-end pr-2 sm:pr-3 transition-all duration-300 hover:from-blue-600 hover:to-blue-700"
                              style={{ width: `${item.percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white truncate">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-24 sm:h-32 text-gray-500">
                    <p className="text-xs sm:text-sm text-center px-2">No items sold in selected period</p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Payment Methods Breakdown */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Revenue by Payment Method</span>
              </h3>
              <div className="h-48 sm:h-64">
                {metrics.totalOrders > 0 ? (
                  <Bar data={paymentChartData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-xs sm:text-sm text-center px-2">No payment data in selected period</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Peak Hours */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Peak Hours Analysis</span>
              </h3>
              <div className="h-48 sm:h-64">
                {metrics.peakHours.length > 0 ? (
                  <Bar data={peakHoursChartData} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-xs sm:text-sm text-center px-2">No order data in selected period</p>
                  </div>
                )}
              </div>
            </Card>
            
            {/* Order Types */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">Orders by Type</span>
              </h3>
              <div className="h-48 sm:h-64">
                {metrics.totalOrders > 0 ? (
                  <Pie data={orderTypeChartData} options={pieChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p className="text-xs sm:text-sm text-center px-2">No order type data in selected period</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
          
          {/* Active Orders Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                  <Table className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-lg font-medium text-gray-900 truncate">
                    Tables
                  </h3>
                  <p className="text-base sm:text-2xl font-semibold text-purple-600 truncate">
                    {occupiedTables}/{totalTables}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {tableOccupancyRate.toFixed(0)}% full
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-lg font-medium text-gray-900 truncate">
                    Completed Today
                  </h3>
                  <p className="text-base sm:text-2xl font-semibold text-green-600 truncate">
                    {completedTodayOrders}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {readyOrders} ready
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <h3 className="text-xs sm:text-lg font-medium text-gray-900 truncate">
                    {hasFullAccess ? (
                      <a href="/manager/pending-orders" className="hover:text-purple-700 transition-colors">
                        Pending Orders
                      </a>
                    ) : (
                      <span className="text-gray-400 cursor-not-allowed">
                        Pending Orders (Approval Required)
                      </span>
                    )}
                  </h3>
                  <p className="text-base sm:text-2xl font-semibold text-purple-600 truncate">
                    {temporaryOrdersCount}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    Click to view details
                  </p>
                </div>
              </div>
            </div>
          </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h2 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button 
              onClick={() => window.location.href = '/manager/tables'}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
            >
              Manage Tables
            </button>
            <button 
              onClick={() => window.location.href = '/manager/catalog'}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
            >
              View Catalog
            </button>
            <button 
              onClick={() => window.location.href = '/manager/orders'}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-medium"
            >
              View All Orders
            </button>
            <button 
              onClick={() => window.location.href = '/manager/users'}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium"
            >
              Staff Management
            </button>
          </div>
        </div>
        </div>
      </DashboardLayout>

      {/* Start Order Button - Same as Staff Dashboard */}
      {hasFullAccess ? (
        <StartOrderButton />
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <button 
            disabled 
            className="bg-gray-400 text-white px-3 py-2 sm:px-6 sm:py-3 rounded-lg shadow-lg cursor-not-allowed opacity-60 flex items-center space-x-2 text-xs sm:text-sm"
            title="You need approval and location assignment to start orders"
          >
            <span className="text-sm sm:text-base">🚫</span>
            <span className="hidden sm:inline">Start Order (Approval Required)</span>
            <span className="sm:hidden">Approval Required</span>
          </button>
        </div>
      )}
    </>
  );
};

export default ManagerDashboard;