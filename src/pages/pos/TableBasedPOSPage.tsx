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
import toast from 'react-hot-toast';

interface TableBasedPOSPageProps {
  // This component handles table-based POS functionality
} // eslint-disable-line @typescript-eslint/no-empty-object-type

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
    setTemporaryOrder,
    calculateTotals,
    getTableNames,
    createPartialOrder,
    checkForExistingOrder,
    updateOrderMode,
    loadFromLocalStorage,
  } = useTemporaryOrder();

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

  // Load specific order by ID
  const loadOrderById = (orderId: string): TemporaryOrder | null => {
    try {
      // First try to load from the specific order key
      const specificOrderKey = `temp_order_${orderId}`;
      const specificOrderData = localStorage.getItem(specificOrderKey);
      
      if (specificOrderData) {
        const order = JSON.parse(specificOrderData);
        return {
          ...order,
          createdAt: new Date(order.createdAt),
          sessionStartedAt: new Date(order.sessionStartedAt),
          updatedAt: new Date(order.updatedAt),
        };
      }
      
      // Fallback to main localStorage
      const mainOrder = loadFromLocalStorage();
      if (mainOrder && mainOrder.id === orderId) {
        return mainOrder;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading order by ID:', error);
      return null;
    }
  };

  // Initialize temporary order when component mounts
  useEffect(() => {
    if (orderContext && !isTemporaryOrderActive) {
      const initializeOrder = async () => {
        try {
          let existingOrder = null;
          
          // If we have a specific order ID, try to load it first
          if (orderContext.orderId) {
            existingOrder = loadOrderById(orderContext.orderId);
            console.log('Loaded order by ID:', existingOrder);
          }
          
          // If no specific order found, check for existing order on tables
          if (!existingOrder) {
            existingOrder = await checkForExistingOrder(orderContext.tableIds);
            console.log('Found existing order by table:', existingOrder);
          }
          
          if (existingOrder) {
            // Load the existing order into the state
            console.log('Loading existing order:', existingOrder);
            setTemporaryOrder(existingOrder);
            
            // Set order mode if it's a delivery order
            if (existingOrder.orderType === 'delivery' && existingOrder.orderMode) {
              setOrderMode(existingOrder.orderMode);
            }
          } else {
            // Start a new temporary order with order mode for delivery
            await startTemporaryOrder(
              orderContext.tableIds, 
              orderContext.orderType, 
              orderContext.orderType === 'delivery' ? orderMode : undefined
            );
          }
        } catch (error) {
          console.error('Failed to initialize order:', error);
        }
      };
      initializeOrder();
    }
  }, [orderContext, isTemporaryOrderActive, checkForExistingOrder, startTemporaryOrder, orderMode, loadOrderById]);

  // Additional effect to handle order editing specifically
  useEffect(() => {
    if (orderContext && isTemporaryOrderActive && temporaryOrder) {
      // If we have a temporary order but it doesn't match the context, reload it
      const orderMatches = temporaryOrder.tableIds.some(tableId => 
        orderContext.tableIds.includes(tableId)
      );
      
      if (!orderMatches) {
        const loadCorrectOrder = async () => {
          try {
            const existingOrder = await checkForExistingOrder(orderContext.tableIds);
            if (existingOrder) {
              setTemporaryOrder(existingOrder);
              if (existingOrder.orderType === 'delivery' && existingOrder.orderMode) {
                setOrderMode(existingOrder.orderMode);
              }
            }
          } catch (error) {
            console.error('Failed to reload correct order:', error);
          }
        };
        loadCorrectOrder();
      }
    }
  }, [orderContext, isTemporaryOrderActive, temporaryOrder, checkForExistingOrder]);

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

    addItemToTemporaryOrder(orderItem);
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
        navigate('/staff/pending-orders');
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
    if (temporaryOrder && temporaryOrder.items.length > 0 && isEditingOrder) {
      try {
        console.log('Saving changes to order:', temporaryOrder);
        
        // Show loading toast
        const loadingToast = toast.loading('Saving changes...');
        
        // Update the existing order in localStorage
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Order</h2>
              {temporaryOrder && (
                <span className="text-sm text-gray-500">
                  {temporaryOrder.items.length} items
                </span>
              )}
            </div>

            {/* Order Mode Selection for Delivery Orders */}
            {orderContext?.orderType === 'delivery' && (
              <div className="mb-6">
                <OrderModeSelection
                  selectedMode={orderMode}
                  onModeChange={setOrderMode}
                />
              </div>
            )}
            
            {temporaryOrder && temporaryOrder.items.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto mb-4">
                  {temporaryOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">₹{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItemFromTemporaryOrder(item.id)}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 ml-2"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{totals.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST (5%)</span>
                    <span>₹{totals.gst}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">₹{totals.total}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  {isEditingOrder ? (
                    <>
                      <Button
                        onClick={handleSaveChanges}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={temporaryOrder.items.length === 0}
                      >
                        <Check size={16} className="mr-2" />
                        Save Changes
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={handleBackToPending}
                        className="w-full"
                      >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Pending Orders
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handlePlacePartialOrder}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={temporaryOrder.items.length === 0}
                      >
                        <CreditCard size={16} className="mr-2" />
                        Place Partial Order
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={clearTemporaryOrder}
                        className="w-full"
                      >
                        Clear Order
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users size={24} className="text-gray-400" />
                  </div>
                  <p>No items in order</p>
                  <p className="text-sm mt-2">Add items from the menu to get started</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TableBasedPOSPage;