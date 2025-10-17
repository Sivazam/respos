import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ArrowLeft, Users, CreditCard, Check, Smartphone, Package, Store } from 'lucide-react';
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
import PortionSelectionModal from '../../components/pos/PortionSelectionModal';
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
  } = useManagerOrder();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [orderMode, setOrderMode] = useState<'zomato' | 'swiggy' | 'in-store'>('in-store');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');
  const [showOrderModeModal, setShowOrderModeModal] = useState(false);

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
    console.log('🔍 Manager POS Page rendering - orderContext:', orderContext);
    console.log('🔍 Manager POS Page rendering - isManagerOrderActive:', isManagerOrderActive);
    console.log('🔍 Manager POS Page rendering - current managerOrder:', managerOrder);
    
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
    const matchesDietary = dietaryFilter === 'all' || 
      (dietaryFilter === 'veg' && item.isVegetarian) || 
      (dietaryFilter === 'non-veg' && !item.isVegetarian);
    return matchesSearch && matchesCategory && matchesDietary;
  });

  // Handle adding items to order
  const handleAddItem = (menuItem: MenuItem) => {
    console.log('🛒 ManagerPOSPage.handleAddItem called:', menuItem);
    
    if (menuItem.hasHalfPortion) {
      console.log('🍽️ Item has half portion, showing modal');
      setSelectedMenuItem(menuItem);
      setShowPortionModal(true);
    } else {
      console.log('📦 Item does not have half portion, adding directly');
      const orderItem: OrderItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        modifications: [],
        notes: '',
        addedAt: new Date(),
        portionSize: 'full'
      };

      addItemToManagerOrder(orderItem);
    }
  };

  // Handle portion selection
  const handlePortionSelect = (portionSize: 'half' | 'full', price: number) => {
    console.log('🍽️ ManagerPOSPage.handlePortionSelect called:', { portionSize, price, selectedMenuItem });
    
    if (selectedMenuItem) {
      const orderItem: OrderItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        menuItemId: selectedMenuItem.id,
        name: selectedMenuItem.name,
        price: price,
        quantity: 1,
        modifications: [],
        notes: '',
        addedAt: new Date(),
        portionSize: portionSize
      };
      
      console.log('🛒 Calling addItemToManagerOrder with:', orderItem);
      addItemToManagerOrder(orderItem);
      
      // Close the modal and clear selection
      setShowPortionModal(false);
      setSelectedMenuItem(null);
    }
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
        // Always navigate to pending orders for new orders, regardless of fromLocation
        navigate('/manager/pending-orders');
      } catch (error) {
        console.error('Failed to place partial manager order:', error);
        toast.error('Failed to create partial order. Please try again.');
      }
    } else {
      toast.error('No items in order to place');
    }
  };



  // Handle back navigation
  const handleBack = () => {
    if (orderContext?.fromLocation) {
      navigate(orderContext.fromLocation);
    } else {
      navigate('/manager/pending-orders');
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
        
        // Import orderService dynamically to avoid circular imports
        const { orderService } = await import('../../services/orderService');
        
        // Update the order in database using OrderService
        await orderService.updateOrderItems(
          managerOrder.id,
          managerOrder.items,
          currentUser.uid
        );
        console.log('✅ Manager order updated in database');
        
        // Update the existing order in localStorage as backup
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
        // Always navigate to pending orders for edited orders, regardless of fromLocation
        navigate('/manager/pending-orders');
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
      {/* Mobile-First Header with Compact Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 lg:p-4 mb-4 lg:mb-6">
        {/* Mobile Header - Compact */}
        <div className="flex items-center justify-between lg:hidden mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-1 text-xs px-2 py-1"
          >
            <ArrowLeft size={14} />
            Back
          </Button>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-green-600">₹{totals.total}</p>
          </div>
        </div>

        {/* Desktop Header - Full */}
        <div className="hidden lg:flex items-center justify-between">
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
            
            <div className="flex items-center space-x-4 flex-wrap">
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
              
              {orderContext?.orderType === 'delivery' && (
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div>
                    <span className="text-sm text-gray-500">Delivery Type</span>
                    <p className="font-semibold capitalize">{orderMode}</p>
                  </div>
                  <button
                    onClick={() => setShowOrderModeModal(true)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Change
                  </button>
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

        {/* Mobile Order Info Pills */}
        <div className="flex flex-wrap gap-2 lg:hidden">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {getOrderTypeDisplay()}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {getOrderFlowDisplay()}
          </span>
          {orderContext?.orderType === 'dinein' && getTableNames().map((table, idx) => (
            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              {table}
            </span>
          ))}
          {orderContext?.orderType === 'delivery' && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium capitalize">
                {orderMode}
              </span>
              <button
                onClick={() => setShowOrderModeModal(true)}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full text-xs font-medium transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Mobile First Responsive Layout */}
      <div className="flex flex-col h-[calc(100vh-16rem)] lg:h-[calc(100vh-12rem)]">
        {/* Mobile Tab Navigation */}
        <div className="flex lg:hidden bg-white border-b border-gray-200 rounded-t-lg mb-0">
          <button
            onClick={() => setActiveMobileTab('menu')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeMobileTab === 'menu'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu
            {filteredProducts.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                {filteredProducts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveMobileTab('cart')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeMobileTab === 'cart'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manager Order
            {managerOrder?.items.length ? (
              <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                {managerOrder.items.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Desktop Layout - Side by Side */}
        <div className="hidden lg:flex lg:gap-6 lg:h-full">
          {/* Menu Section - Desktop */}
          <div className="flex-1 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Menu Items</h2>
            
            {/* Search and Filters - Desktop */}
            <div className="mb-4 space-y-3 flex-shrink-0">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-gray-500" />}
              />
              
              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category.id
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              
              {/* Dietary Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDietaryFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    dietaryFilter === 'all'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Food
                </button>
                <button
                  onClick={() => setDietaryFilter('veg')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    dietaryFilter === 'veg'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🟢 Veg
                </button>
                <button
                  onClick={() => setDietaryFilter('non-veg')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    dietaryFilter === 'non-veg'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔴 Non-Veg
                </button>
              </div>
            </div>

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

          {/* Cart Section - Desktop */}
          <div className="w-96 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Manager Order</h2>
              {managerOrder && (
                <span className="text-sm text-gray-500">
                  {managerOrder.items.length} items
                </span>
              )}
            </div>

            {managerOrder && managerOrder.items.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {managerOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.name}
                            {item.portionSize === 'half' && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Half</span>
                            )}
                            {item.portionSize === 'full' && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Full</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeItemFromManagerOrder(item.id)}
                            className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-xs text-red-600 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4 space-y-2 flex-shrink-0">
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
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">₹{totals.total}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2 flex-shrink-0">
                  {isEditingOrder ? (
                    <>
                      <button
                        onClick={handleSaveChanges}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleBackToPending}
                        className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handlePlacePartialOrder}
                        className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Create Partial Order
                      </button>
                      <button
                        onClick={handleBackToPending}
                        className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Back to Pending Orders
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">No items in order</p>
                  <p className="text-sm">Add items from the menu to start</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Content - Tab Based */}
        <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
          {activeMobileTab === 'menu' && (
            <div className="flex-1 bg-white rounded-b-lg shadow-sm p-3 overflow-hidden flex flex-col">
              {/* Mobile Search and Filters */}
              <div className="mb-3 space-y-3 flex-shrink-0">
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
                
                {/* Mobile Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
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
                      className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        selectedCategory === category.id
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                
                {/* Mobile Dietary Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setDietaryFilter('all')}
                    className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      dietaryFilter === 'all'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Food
                  </button>
                  <button
                    onClick={() => setDietaryFilter('veg')}
                    className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      dietaryFilter === 'veg'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🟢 Veg
                  </button>
                  <button
                    onClick={() => setDietaryFilter('non-veg')}
                    className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      dietaryFilter === 'non-veg'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🔴 Non-Veg
                  </button>
                </div>
              </div>

              {/* Mobile Products Grid */}
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
                    onAddToCart={(menuItem) => {
                      handleAddItem(menuItem);
                      // Auto-switch to cart tab after adding item
                      setActiveMobileTab('cart');
                    }}
                  />
                )}
              </div>
              
              {/* Mobile Cart Preview */}
              {managerOrder && managerOrder.items.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Order Total</p>
                      <p className="text-xl font-bold text-green-600">₹{totals.total}</p>
                    </div>
                    <button
                      onClick={() => setActiveMobileTab('cart')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Cart ({managerOrder.items.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMobileTab === 'cart' && (
            <div className="flex-1 bg-white rounded-b-lg shadow-sm p-3 overflow-hidden flex flex-col">
              
              {managerOrder && managerOrder.items.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Mobile Cart Items */}
                  <div className="flex-1 overflow-y-auto mb-4">
                    <div className="space-y-3">
                      {managerOrder.items.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-1">
                                {item.name}
                                {item.portionSize === 'half' && (
                                  <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Half</span>
                                )}
                                {item.portionSize === 'full' && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Full</span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                            </div>
                            <button
                              onClick={() => removeItemFromManagerOrder(item.id)}
                              className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-xs text-red-600 flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium"
                              >
                                -
                              </button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <button
                                onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-semibold text-sm">₹{item.price * item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Order Summary */}
                  <div className="border-t pt-4 space-y-2 flex-shrink-0">
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
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span className="text-green-600">₹{totals.total}</span>
                    </div>
                  </div>

                  {/* Mobile Cart Actions */}
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    {isEditingOrder ? (
                      <>
                        <button
                          onClick={handleSaveChanges}
                          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Save Changes
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={handleBackToPending}
                            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setActiveMobileTab('menu')}
                            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Add Items
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handlePlacePartialOrder}
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Create Partial Order
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setActiveMobileTab('menu')}
                            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Add Items
                          </button>
                          <button
                            onClick={handleBackToPending}
                            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Back to Pending
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">No items in order</p>
                    <p className="text-sm mb-4">Add items from the menu to get started</p>
                    <button
                      onClick={() => setActiveMobileTab('menu')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Browse Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Mode Modal */}
      {showOrderModeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Select Order Mode</h3>
                <button
                  onClick={() => setShowOrderModeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setOrderMode('zomato');
                    setShowOrderModeModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    orderMode === 'zomato'
                      ? 'bg-pink-100 border-pink-300 text-pink-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-pink-50 hover:border-pink-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={orderMode === 'zomato' ? 'text-pink-600' : 'text-gray-400'}>
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold">Zomato</h4>
                      <p className="text-sm opacity-80">Order from Zomato platform</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOrderMode('swiggy');
                    setShowOrderModeModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    orderMode === 'swiggy'
                      ? 'bg-orange-100 border-orange-300 text-orange-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-orange-50 hover:border-orange-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={orderMode === 'swiggy' ? 'text-orange-600' : 'text-gray-400'}>
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold">Swiggy</h4>
                      <p className="text-sm opacity-80">Order from Swiggy platform</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setOrderMode('in-store');
                    setShowOrderModeModal(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    orderMode === 'in-store'
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={orderMode === 'in-store' ? 'text-blue-600' : 'text-gray-400'}>
                      <Store size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold">In-Store</h4>
                      <p className="text-sm opacity-80">Direct in-store delivery order</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portion Selection Modal */}
      {selectedMenuItem && (
        <>
          {console.log('🔍 ManagerPOSPage rendering PortionSelectionModal:', { selectedMenuItem, showPortionModal })}
          <PortionSelectionModal
            menuItem={selectedMenuItem}
            isOpen={showPortionModal}
            onClose={() => {
              console.log('🔍 ManagerPOSPage closing modal');
              setShowPortionModal(false);
              setSelectedMenuItem(null);
            }}
            onSelect={handlePortionSelect}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default ManagerPOSPage;