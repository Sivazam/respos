import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ArrowLeft, Users, CreditCard, Check } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
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

interface TableBasedPOSPageProps {
  // This component handles table-based POS functionality
}  

const TableBasedPOSPage: React.FC<TableBasedPOSPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuItems, loading, error } = useMenuItems();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const { refreshTables } = useTables();
  const {
    temporaryOrder,
    isTemporaryOrderActive,
    startTemporaryOrder,
    addItemToTemporaryOrder,
    removeItemFromTemporaryOrder,
    updateItemQuantity,
    clearTemporaryOrder,
    clearCurrentOrder,
    calculateTotals,
    getTableNames,
    createPartialOrder,
    checkForExistingOrder,
    updateOrderMode,
    loadOrderIntoCart,
  } = useTemporaryOrder();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [orderMode, setOrderMode] = useState<'zomato' | 'swiggy' | 'in-store'>('in-store');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');

  // Get order context from navigation state
  const orderContext = location.state as {
    orderType: 'dinein' | 'delivery';
    tableIds: string[];
    isOngoing: boolean;
    fromLocation?: string;
    orderId?: string; // Add order ID for loading specific order
  };

  // Initialize temporary order when component mounts
  useEffect(() => {
    console.log('🔍 POS Page - orderContext:', orderContext);
    console.log('🔍 POS Page - isTemporaryOrderActive:', isTemporaryOrderActive);
    console.log('🔍 POS Page - current temporaryOrder:', temporaryOrder);
    
    if (orderContext) {
      const initializeOrder = async () => {
        try {
          console.log('🚀 Starting order initialization with context:', orderContext);
          
          // Always clear any existing order first to prevent stale data
          if (isTemporaryOrderActive || temporaryOrder) {
            console.log('🧹 Clearing existing order before initialization...');
            clearCurrentOrder();
            // Wait a moment for the state to update
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          let existingOrder = null;
          
          // If we have a specific order ID, try to load it first
          if (orderContext.orderId) {
            console.log('📦 Loading order by ID:', orderContext.orderId);
            existingOrder = await loadOrderIntoCart(orderContext.orderId);
            console.log('✅ Loaded order by ID into cart:', existingOrder);
          }
          
          // If no specific order found, check for existing order on tables
          if (!existingOrder) {
            console.log('🔍 No order loaded by ID, checking for existing order on tables:', orderContext.tableIds);
            existingOrder = await checkForExistingOrder(orderContext.tableIds);
            console.log('🔍 Found existing order by table:', existingOrder);
            
            if (existingOrder) {
              // Load the existing order into the cart using the new function
              console.log('📦 Loading existing order into cart:', existingOrder.id);
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
            // Start a new temporary order with order mode for delivery
            console.log('🆕 Starting new temporary order with:', {
              tableIds: orderContext.tableIds,
              orderType: orderContext.orderType,
              orderMode: orderContext.orderType === 'delivery' ? orderMode : undefined
            });
            await startTemporaryOrder(
              orderContext.tableIds, 
              orderContext.orderType, 
              orderContext.orderType === 'delivery' ? orderMode : undefined
            );
          }
        } catch (error) {
          console.error('❌ Failed to initialize order:', error);
        }
      };
      
      initializeOrder();
    }
  }, [orderContext]); // Remove other dependencies to prevent re-initialization loops

  // Update order mode when it changes for delivery orders
  useEffect(() => {
    if (temporaryOrder && temporaryOrder.orderType === 'delivery' && temporaryOrder.orderMode !== orderMode) {
      updateOrderMode(orderMode);
    }
  }, [orderMode, temporaryOrder, updateOrderMode]);

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
    if (menuItem.hasHalfPortion) {
      setSelectedMenuItem(menuItem);
      setShowPortionModal(true);
    } else {
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

      addItemToTemporaryOrder(orderItem);
    }
  };

  const handlePortionSelect = (portionSize: 'half' | 'full', price: number) => {
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

      addItemToTemporaryOrder(orderItem);
      // Close the modal and clear selection
      setShowPortionModal(false);
      setSelectedMenuItem(null);
    }
  };

  // Handle placing partial order
  const handlePlacePartialOrder = async () => {
    if (temporaryOrder && temporaryOrder.items.length > 0) {
      try {
        console.log('Placing partial order for:', temporaryOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Creating partial order...');
        
        // Create the partial order first
        const updatedOrder = await createPartialOrder();
        console.log('Partial order created:', updatedOrder);
        
        // Refresh tables to ensure the latest status is reflected
        await refreshTables();
        console.log('Tables refreshed');
        
        // Clear the current order from state (but keep it in localStorage)
        clearCurrentOrder();
        console.log('Current order cleared from state');
        
        // Show success toast
        toast.success(`Partial order ${updatedOrder.orderNumber} created successfully!`, { 
          id: loadingToast 
        });
        
        // Navigate to pending orders page
        console.log('Navigating to pending orders...');
        if (orderContext?.fromLocation) {
          navigate(orderContext.fromLocation);
        } else {
          navigate('/staff/pending-orders');
        }
      } catch (error) {
        console.error('Failed to place partial order:', error);
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
    if (temporaryOrder && temporaryOrder.status === 'ongoing') {
      return 'Edit Order - Ongoing';
    }
    return orderContext.isOngoing ? 'Edit Order - Ongoing' : 'New Order';
  };

  // Check if this is an edit operation
  const isEditingOrder = orderContext?.isOngoing || (temporaryOrder && temporaryOrder.status === 'ongoing');

  // Handle save changes for edited orders
  const handleSaveChanges = async () => {
    if (temporaryOrder && temporaryOrder.items.length > 0 && isEditingOrder && currentUser) {
      try {
        console.log('Saving changes to order:', temporaryOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Saving changes...');
        
        // Import orderService dynamically to avoid circular imports
        const { orderService } = await import('../../services/orderService');
        
        // Update the order in database using OrderService
        await orderService.updateOrderItems(
          temporaryOrder.id,
          temporaryOrder.items,
          currentUser.uid
        );
        console.log('✅ Order updated in database');
        
        // Update the existing order in localStorage as backup
        const updatedOrder = {
          ...temporaryOrder,
          updatedAt: new Date(),
          totalAmount: totals.total
        };
        
        // Save to localStorage
        localStorage.setItem(`temp_order_${temporaryOrder.id}`, JSON.stringify(updatedOrder));
        
        // Also update the main temporary order if it exists
        const mainOrderKey = 'restaurant_temporary_order';
        const mainOrderData = localStorage.getItem(mainOrderKey);
        if (mainOrderData) {
          const mainOrder = JSON.parse(mainOrderData);
          if (mainOrder.id === temporaryOrder.id) {
            localStorage.setItem(mainOrderKey, JSON.stringify(updatedOrder));
          }
        }
        
        // Refresh tables to ensure the latest status is reflected
        await refreshTables();
        
        // Clear the current order from state
        clearCurrentOrder();
        
        // Show success toast
        toast.success(`Order ${updatedOrder.orderNumber} updated successfully!`, { 
          id: loadingToast 
        });
        
        // Navigate back to pending orders
        if (orderContext?.fromLocation) {
          navigate(orderContext.fromLocation);
        } else {
          navigate('/staff/pending-orders');
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
    clearCurrentOrder();
    
    // Navigate back to pending orders
    if (orderContext?.fromLocation) {
      navigate(orderContext.fromLocation);
    } else {
      navigate('/manager/pending-orders');
    }
  };

  const totals = calculateTotals();

  return (
    <DashboardLayout title="Table-Based POS">
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
              
              {orderContext?.orderType === 'delivery' && (
                <div>
                  <span className="text-sm text-gray-500">Delivery Type</span>
                  <p className="font-semibold capitalize">{orderMode}</p>
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
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium capitalize">
              {orderMode}
            </span>
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
            Current Order
            {temporaryOrder?.items.length ? (
              <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                {temporaryOrder.items.length}
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
                  onAddToCart={handleAddItem}
                />
              )}
            </div>
          </div>

          {/* Cart Section - Desktop */}
          <div className="w-96 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Current Order</h2>
              {temporaryOrder && (
                <span className="text-sm text-gray-500">
                  {temporaryOrder.items.length} items
                </span>
              )}
            </div>

            {/* Order Mode Selection for Delivery Orders */}
            {orderContext?.orderType === 'delivery' && (
              <div className="mb-4 flex-shrink-0">
                <OrderModeSelection
                  selectedMode={orderMode}
                  onModeChange={setOrderMode}
                />
              </div>
            )}
            
            {temporaryOrder && temporaryOrder.items.length > 0 ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {temporaryOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            ₹{item.price} x {item.quantity}
                            {item.portionSize === 'half' && ' (Half)'}
                          </p>
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
                            onClick={() => removeItemFromTemporaryOrder(item.id)}
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
                    <button
                      onClick={handlePlacePartialOrder}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Place Partial Order
                    </button>
                  )}
                  <button
                    onClick={handleBack}
                    className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p>No items in order</p>
                  <p className="text-sm">Add items from the menu to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout - Tabbed Content */}
        <div className="flex-1 lg:hidden bg-white shadow rounded-lg overflow-hidden flex flex-col">
          {activeMobileTab === 'menu' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
              </div>
              
              {/* Mobile Categories */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      !selectedCategory
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
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

              <div className="flex-1 overflow-y-auto p-4">
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
              {temporaryOrder && temporaryOrder.items.length > 0 && (
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
                      View Cart ({temporaryOrder.items.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMobileTab === 'cart' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Current Order</h2>
                {temporaryOrder && (
                  <span className="text-sm text-gray-500">
                    {temporaryOrder.items.length} items
                  </span>
                )}
              </div>

              {/* Order Mode Selection for Delivery Orders */}
              {orderContext?.orderType === 'delivery' && (
                <div className="p-4 border-b border-gray-200">
                  <OrderModeSelection
                    selectedMode={orderMode}
                    onModeChange={setOrderMode}
                  />
                </div>
              )}
              
              {temporaryOrder && temporaryOrder.items.length > 0 ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Cart Items */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                      {temporaryOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              ₹{item.price} x {item.quantity}
                              {item.portionSize === 'half' && ' (Half)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              -
                            </button>
                            <span className="font-medium w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeItemFromTemporaryOrder(item.id)}
                              className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-sm text-red-600 ml-2"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-2">
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
                          Place Partial Order
                        </button>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setActiveMobileTab('menu')}
                            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Add Items
                          </button>
                          <button
                            onClick={handleBack}
                            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            Back
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-gray-500">
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

      {/* Portion Selection Modal */}
      {selectedMenuItem && (
        <PortionSelectionModal
          menuItem={selectedMenuItem}
          isOpen={showPortionModal}
          onClose={() => {
            setShowPortionModal(false);
            setSelectedMenuItem(null);
          }}
          onSelect={handlePortionSelect}
        />
      )}
    </DashboardLayout>
  );
};

export default TableBasedPOSPage;