import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ArrowLeft, Users, CreditCard, Check } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useManagerOrder } from '../../contexts/ManagerOrderContext';
import { useTables } from '../../contexts/TableContext';
import { useAuth } from '../../contexts/AuthContext';
import { OrderItem, MenuItem } from '../../types';
import ProductGrid from '../../components/pos/ProductGrid';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { Card } from '../../components/ui/card';
import OrderModeSelection from '../../components/order/OrderModeSelection';
import toast from 'react-hot-toast';

interface ManagerPOSPageProps {
  // This component handles manager-specific POS functionality
}  

const ManagerPOSPage: React.FC<ManagerPOSPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuItems, loading, error } = useMenuItems();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const { refreshTables } = useTables();
  const {
    managerOrder,
    isManagerOrderActive,
    startManagerOrder,
    addItemToManagerOrder,
    removeItemFromManagerOrder,
    updateItemQuantity,
    clearCurrentManagerOrder,
    calculateTotals,
    getTableNames,
    createPartialManagerOrder,
    checkForExistingManagerOrder,
    updateOrderMode,
    loadOrderIntoCart,
    settleManagerOrder,
  } = useManagerOrder();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [orderMode, setOrderMode] = useState<'zomato' | 'swiggy' | 'in-store'>('in-store');

  // Get order context from navigation state
  const orderContext = location.state as {
    orderType: 'dinein' | 'delivery';
    tableIds: string[];
    isOngoing: boolean;
    fromLocation?: string;
    orderId?: string; // Add order ID for loading specific order
  };

  // Initialize manager order when component mounts
  useEffect(() => {
    console.log('🔍 Manager POS Page - orderContext:', orderContext);
    console.log('🔍 Manager POS Page - isManagerOrderActive:', isManagerOrderActive);
    console.log('🔍 Manager POS Page - current managerOrder:', managerOrder);
    
    if (orderContext) {
      const initializeOrder = async () => {
        try {
          console.log('🚀 Starting manager order initialization with context:', orderContext);
          
          // Always clear any existing order first to prevent stale data
          if (isManagerOrderActive || managerOrder) {
            console.log('🧹 Clearing existing manager order before initialization...');
            clearCurrentManagerOrder();
            // Wait a moment for the state to update
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          let existingOrder = null;
          
          // If we have a specific order ID, try to load it first
          if (orderContext.orderId) {
            console.log('📦 Loading manager order by ID:', orderContext.orderId);
            existingOrder = await loadOrderIntoCart(orderContext.orderId);
            console.log('✅ Loaded manager order by ID into cart:', existingOrder);
          }
          
          // If no specific order found, check for existing order on tables
          if (!existingOrder) {
            console.log('🔍 No order loaded by ID, checking for existing manager order on tables:', orderContext.tableIds);
            existingOrder = await checkForExistingManagerOrder(orderContext.tableIds);
            console.log('🔍 Found existing manager order by table:', existingOrder);
            
            if (existingOrder) {
              // Load the existing order into the cart
              console.log('📦 Loading existing manager order into cart:', existingOrder.id);
              await loadOrderIntoCart(existingOrder.id);
            }
          }
          
          if (existingOrder) {
            // Set order mode if it's a delivery order
            if (existingOrder.orderType === 'delivery' && existingOrder.orderMode) {
              console.log('🔧 Setting order mode for delivery:', existingOrder.orderMode);
              setOrderMode(existingOrder.orderMode);
            }
          } else {
            // Start a new manager order
            console.log('🆕 Starting new manager order with:', {
              tableIds: orderContext.tableIds,
              orderType: orderContext.orderType,
              orderMode: orderContext.orderType === 'delivery' ? orderMode : undefined
            });
            await startManagerOrder(
              orderContext.tableIds, 
              orderContext.orderType, 
              orderContext.orderType === 'delivery' ? orderMode : undefined
            );
          }
        } catch (error) {
          console.error('❌ Failed to initialize manager order:', error);
        }
      };
      
      initializeOrder();
    }
  }, [orderContext]); // Remove other dependencies to prevent re-initialization loops

  // Update order mode when it changes for delivery orders
  useEffect(() => {
    if (managerOrder && managerOrder.orderType === 'delivery' && managerOrder.orderMode !== orderMode) {
      updateOrderMode(orderMode);
    }
  }, [orderMode, managerOrder, updateOrderMode]);

  // Get menu items for current location
  const locationMenuItems = menuItems.filter(item => 
    item.locationId === currentUser?.locationId && item.isAvailable
  );

  // Filter products
  const filteredProducts = locationMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle adding items to order
  const handleAddItem = (menuItem: MenuItem) => {
    const orderItem: OrderItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: 1,
      modifications: [],
      notes: '',
      addedAt: new Date(),
    };

    addItemToManagerOrder(orderItem);
  };

  // Handle placing partial order
  const handlePlacePartialOrder = async () => {
    if (managerOrder && managerOrder.items.length > 0) {
      try {
        console.log('Placing partial manager order for:', managerOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Creating partial order...');
        
        // Create the partial order first
        const updatedOrder = await createPartialManagerOrder();
        console.log('Partial manager order created:', updatedOrder);
        
        // Refresh tables to ensure the latest status is reflected
        await refreshTables();
        console.log('Tables refreshed');
        
        // Clear the current order from state (but keep it in localStorage)
        clearCurrentManagerOrder();
        console.log('Current manager order cleared from state');
        
        // Show success toast
        toast.success(`Partial order ${updatedOrder.orderNumber} created successfully!`, { 
          id: loadingToast 
        });
        
        // Navigate to manager pending orders page
        console.log('Navigating to manager pending orders...');
        if (orderContext?.fromLocation) {
          navigate(orderContext.fromLocation);
        } else {
          navigate('/manager/pending-orders');
        }
      } catch (error) {
        console.error('Failed to place partial manager order:', error);
        toast.error('Failed to create partial order. Please try again.');
      }
    } else {
      toast.error('No items in order to place');
    }
  };

  // Handle settle order (manager settles directly)
  const handleSettleOrder = async () => {
    if (managerOrder && managerOrder.items.length > 0) {
      try {
        console.log('Settling manager order:', managerOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Settling order...');
        
        // Settle the order (convert to final order)
        await settleManagerOrder('cash'); // Default to cash, can be enhanced with payment modal
        
        // Refresh tables
        await refreshTables();
        
        // Show success toast
        toast.success(`Order ${managerOrder.orderNumber} settled successfully!`, { 
          id: loadingToast 
        });
        
        // Navigate to manager pending orders page
        if (orderContext?.fromLocation) {
          navigate(orderContext.fromLocation);
        } else {
          navigate('/manager/pending-orders');
        }
      } catch (error) {
        console.error('Failed to settle manager order:', error);
        toast.error('Failed to settle order. Please try again.');
      }
    } else {
      toast.error('No items in order to settle');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (orderContext?.fromLocation) {
      navigate(orderContext.fromLocation);
    } else {
      navigate('/manager');
    }
  };

  // Get order type display
  const getOrderTypeDisplay = () => {
    if (!orderContext) return '';
    return orderContext.orderType === 'dinein' ? 'Dine-in' : 'Delivery';
  };

  // Get order flow display
  const getOrderFlowDisplay = () => {
    if (!orderContext) return '';
    if (managerOrder && managerOrder.status === 'ongoing') {
      return 'Edit Order - Ongoing';
    }
    return orderContext.isOngoing ? 'Edit Order - Ongoing' : 'New Order';
  };

  // Check if this is an edit operation
  const isEditingOrder = orderContext?.isOngoing || (managerOrder && managerOrder.status === 'ongoing');

  // Handle save changes for edited orders
  const handleSaveChanges = async () => {
    if (managerOrder && managerOrder.items.length > 0 && isEditingOrder && currentUser) {
      try {
        console.log('Saving changes to manager order:', managerOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Saving changes...');
        
        // Update the existing order in localStorage
        const updatedOrder = {
          ...managerOrder,
          updatedAt: new Date(),
          totalAmount: totals.total
        };
        
        // Save to localStorage with manager_pending_ prefix
        const key = `manager_pending_${updatedOrder.id}`;
        localStorage.setItem(key, JSON.stringify({
          ...updatedOrder,
          createdAt: updatedOrder.createdAt.toISOString(),
          sessionStartedAt: updatedOrder.sessionStartedAt.toISOString(),
          updatedAt: updatedOrder.updatedAt.toISOString(),
        }));
        
        // Refresh tables to ensure the latest status is reflected
        await refreshTables();
        
        // Clear the current order from state
        clearCurrentManagerOrder();
        
        // Show success toast
        toast.success(`Manager order ${updatedOrder.orderNumber} updated successfully!`, { 
          id: loadingToast 
        });
        
        // Navigate back to manager pending orders
        if (orderContext?.fromLocation) {
          navigate(orderContext.fromLocation);
        } else {
          navigate('/manager/pending-orders');
        }
      } catch (error) {
        console.error('Failed to save changes:', error);
        toast.error('Failed to save changes. Please try again.');
      }
    } else {
      toast.error('No items in order to save');
    }
  };

  // Handle back to pending approval
  const handleBackToPending = () => {
    // Clear the current order from state without saving
    clearCurrentManagerOrder();
    
    // Navigate back to manager pending orders
    if (orderContext?.fromLocation) {
      navigate(orderContext.fromLocation);
    } else {
      navigate('/manager/pending-orders');
    }
  };

  const totals = calculateTotals();

  return (
    <DashboardLayout title="Manager POS">
      {/* Header with Order Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            
            <div className="flex items-center space-x-6">
              <div>
                <span className="text-sm text-gray-500">Order Type</span>
                <p className="font-semibold">{getOrderTypeDisplay()}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p className="font-semibold">{getOrderFlowDisplay()}</p>
              </div>
              
              {orderContext?.orderType === 'dinein' && (
                <div>
                  <span className="text-sm text-gray-500">Table(s)</span>
                  <p className="font-semibold">{getTableNames().join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-sm text-gray-500">Order Total</span>
              <p className="text-2xl font-bold text-green-600">₹{totals.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
        {/* Products Section */}
        <div className="flex-1 flex flex-col min-h-0">
          {error && <ErrorAlert message={error} />}
          
          {/* Search and Filters */}
          <div className="mb-4 space-y-4">
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  !selectedCategory
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No menu items found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                category={selectedCategory}
                onAddToCart={handleAddItem}
              />
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-96">
          <Card className="h-full p-6">
            <h3 className="text-lg font-semibold mb-4">Manager Order</h3>
            
            {managerOrder && managerOrder.items.length > 0 ? (
              <div className="flex flex-col h-full">
                {/* Order Items */}
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {managerOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItemFromManagerOrder(item.id)}
                            className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-sm text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST:</span>
                    <span>₹{totals.cgstAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST:</span>
                    <span>₹{totals.sgstAmount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">₹{totals.total}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-4">
                  {isEditingOrder ? (
                    <>
                      <Button
                        onClick={handleSaveChanges}
                        className="w-full"
                      >
                        Save Changes
                      </Button>
                      <Button
                        onClick={handleSettleOrder}
                        className="w-full"
                        variant="secondary"
                      >
                        Settle Order
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handlePlacePartialOrder}
                        className="w-full"
                      >
                        Create Partial Order
                      </Button>
                      <Button
                        onClick={handleSettleOrder}
                        className="w-full"
                        variant="secondary"
                      >
                        Settle Order
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={handleBackToPending}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Pending Orders
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No items in order</p>
                  <p className="text-sm">Add items from the menu to start</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerPOSPage;