import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useTables } from '../../contexts/TableContext';
import { useManagerOrder } from '../../contexts/ManagerOrderContext';
import ProductGrid from '../../components/pos/ProductGrid';
import OptimizedProductList from '../../components/pos/OptimizedProductList';
import Cart from '../../components/pos/Cart';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import CheckoutModal from '../../components/pos/CheckoutModal';
import ReceiptModal from '../../components/pos/ReceiptModal';
import PortionSelectionModal from '../../components/pos/PortionSelectionModal';
import { Sale, Receipt, MenuItem, CartItem } from '../../types';
import toast from 'react-hot-toast';

const ManagerPOSPage: React.FC = () => {
  const location = useLocation();
  const { menuItems, loading, error } = useMenuItems();
  const { categories } = useCategories();
  const { items, subtotal, cgst, sgst, total, clearCart, addItem, cgstRate, sgstRate } = useCart();
  const { currentUser } = useAuth();
  const { addSale } = useSales();
  const { tables } = useTables();
  const { 
    managerOrder,
    isManagerOrderActive,
    startManagerOrder, 
    loadOrderIntoCart: loadManagerOrderIntoCart,
    checkForExistingManagerOrder,
    addItemToManagerOrder,
    removeItemFromManagerOrder,
    updateItemQuantity,
    clearManagerOrder,
    createPartialManagerOrder,
    calculateTotals
  } = useManagerOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [useOptimizedView, setUseOptimizedView] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'menu' | 'cart'>('menu');
  
  // Check if this is a table-based order
  const isTableBasedOrder = location.state?.orderType && location.state?.tableIds;
  const orderType = location.state?.orderType || 'dinein';
  const tableIds = location.state?.tableIds || [];
  const tableNamesFromState = location.state?.tableNames || [];
  const isOngoingOrder = location.state?.isOngoing || false;
  const orderId = location.state?.orderId;
  
  // Get table names from table IDs (fallback if not provided in state)
  const tableNames = useMemo(() => {
    if (tableNamesFromState && tableNamesFromState.length > 0) {
      return tableNamesFromState;
    }
    
    if (!tableIds || tableIds.length === 0) return [];
    
    return tableIds.map(id => {
      const table = tables.find(t => t.id === id);
      if (table) {
        return table.name || `Table ${table.number}`;
      }
      
      // Fallback: extract table number from ID
      const tableMatch = id.match(/table-(\d+)/i);
      if (tableMatch) {
        return `Table ${tableMatch[1]}`;
      }
      if (/^\d+$/.test(id)) {
        return `Table ${id}`;
      }
      const numberMatch = id.match(/\d+/);
      if (numberMatch) {
        return `Table ${numberMatch[0]}`;
      }
      return id;
    });
  }, [tableIds, tables, tableNamesFromState]);
  
  // Get menu items for current location
  const locationMenuItems = useMemo(() => {
    return menuItems.filter(item => 
      item.locationId === currentUser?.locationId && item.isAvailable
    );
  }, [menuItems, currentUser?.locationId]);
  
  const filteredProducts = useMemo(() => {
    return locationMenuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
      const matchesStock = showOutOfStock || item.isAvailable;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [locationMenuItems, searchTerm, selectedCategory, showOutOfStock]);

  const handleAddToCart = (menuItem: MenuItem) => {
    if (menuItem.hasHalfPortion) {
      setSelectedMenuItem(menuItem);
      setShowPortionModal(true);
    } else {
      handleAddItem({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        modifications: [],
        notes: '',
        portionSize: 'full'
      });
    }
  };

  const handlePortionSelect = (portionSize: 'half' | 'full', price: number) => {
    if (selectedMenuItem) {
      handleAddItem({
        menuItemId: selectedMenuItem.id,
        name: selectedMenuItem.name,
        price: price,
        modifications: [],
        notes: '',
        portionSize: portionSize
      });
      // Close the modal and clear selection
      setShowPortionModal(false);
      setSelectedMenuItem(null);
    }
  };

  // Initialize manager order when component mounts
  useEffect(() => {
    console.log('🔍 Manager POS Page - orderContext:', { orderType, tableIds, isOngoingOrder, orderId });
    
    if (isTableBasedOrder && !isManagerOrderActive) {
      const initializeOrder = async () => {
        try {
          let existingOrder = null;
          
          // If we have a specific order ID, try to load it first
          if (orderId) {
            console.log('📦 Manager loading order by ID:', orderId);
            existingOrder = await loadManagerOrderIntoCart(orderId);
            console.log('✅ Manager loaded order by ID into cart:', existingOrder);
          }
          
          // If no specific order found, check for existing manager order on tables
          if (!existingOrder) {
            existingOrder = await checkForExistingManagerOrder(tableIds);
            console.log('🔍 Manager found existing order by table:', existingOrder);
            
            if (existingOrder) {
              // Load the existing order into the cart
              await loadManagerOrderIntoCart(existingOrder.id);
            }
          }
          
          if (!existingOrder) {
            // Start a new manager order
            await startManagerOrder(tableIds, orderType === 'dinein' ? 'dinein' : 'delivery', 
              orderType === 'delivery' ? (location.state?.orderMode || 'in-store') : 'in-store');
            console.log('🆕 Manager started new manager order');
          }
        } catch (error) {
          console.error('Manager failed to initialize order:', error);
          toast.error('Failed to initialize order');
        }
      };
      initializeOrder();
    }
  }, [isTableBasedOrder, isManagerOrderActive, tableIds, orderType, orderId, loadManagerOrderIntoCart, checkForExistingManagerOrder, startManagerOrder]);

  // Get manager order totals for display
  const managerOrderTotals = calculateTotals();
  const displayItems = isTableBasedOrder && isManagerOrderActive ? managerOrder?.items || [] : items;
  const displaySubtotal = isTableBasedOrder && isManagerOrderActive ? managerOrderTotals.subtotal : subtotal;
  const displayCgst = isTableBasedOrder && isManagerOrderActive ? managerOrderTotals.cgstAmount : cgst;
  const displaySgst = isTableBasedOrder && isManagerOrderActive ? managerOrderTotals.sgstAmount : sgst;
  const displayTotal = isTableBasedOrder && isManagerOrderActive ? managerOrderTotals.total : total;

  const handleCheckout = () => {
    if (displayItems.length > 0) {
      setShowCheckout(true);
    }
  };

  const handleSavePartialOrder = async () => {
    if (!isTableBasedOrder || !isManagerOrderActive) return;
    
    try {
      await createPartialManagerOrder();
      toast.success('Order saved to pending orders!');
    } catch (error) {
      console.error('Error saving partial order:', error);
      toast.error('Failed to save order. Please try again.');
    }
  };

  const handleClearCart = () => {
    if (isTableBasedOrder && isManagerOrderActive) {
      clearManagerOrder();
    } else {
      clearCart();
    }
    toast.success('Cart cleared');
  };

  const handleConfirmCheckout = async (paymentMethod: Sale['paymentMethod']) => {
    if (!currentUser) return;

    try {
      // Get the current location
      const locationId = currentUser.locationId;

      if (isTableBasedOrder && isManagerOrderActive) {
        // Save the manager order to Firestore
        await createPartialManagerOrder();
        
        // For manager orders, we could directly settle them or transfer to pending
        // For now, let's just save and show success
        toast.success('Manager order saved successfully!');
        setShowCheckout(false);
        
        // Optionally clear the manager order after saving
        setTimeout(() => {
          clearManagerOrder();
        }, 1000);
      } else if (isTableBasedOrder) {
        // Create a temporary order for table-based orders using orderService
        const orderFormData = {
          tableIds,
          orderType: orderType === 'dinein' ? 'dinein' : (orderType === 'delivery' ? 'delivery' : 'dinein'),
          items: items.map(item => ({
            ...item,
            id: item.id || `temp_${Date.now()}_${Math.random()}`,
            menuItemId: item.menuItemId || item.id,
            name: item.name || 'Unknown Item',
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            modifications: item.modifications || [],
            notes: item.notes || ''
          })),
        };

        const orderId = await orderService.createTemporaryOrder(
          orderFormData,
          currentUser,
          locationId || 'default_location',
          currentUser.franchiseId || 'default-franchise'
        );

        // Update the order with items and totals
        await orderService.updateOrderItems(orderId, items.map(item => ({
          ...item,
          id: item.id || `temp_${Date.now()}_${Math.random()}`,
          menuItemId: item.menuItemId || item.id,
          name: item.name || 'Unknown Item',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          modifications: item.modifications || [],
          notes: item.notes || ''
        })), currentUser.uid || currentUser.id || 'unknown');

        toast.success('Order created successfully!');
      } else {
        // Create a direct sale for takeaway orders
        const saleData: Omit<Sale, 'id' | 'createdAt' | 'invoiceNumber'> = {
          items: items.map(item => ({
            ...item,
            id: item.id || `temp_${Date.now()}_${Math.random()}`,
            menuItemId: item.menuItemId || item.id,
            name: item.name || 'Unknown Item',
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            modifications: item.modifications || [],
            notes: item.notes || ''
          })),
          subtotal: Number(subtotal) || 0,
          cgst: Number(cgst) || 0,
          sgst: Number(sgst) || 0,
          total: Number(total) || 0,
          paymentMethod,
          createdBy: currentUser.uid || currentUser.id || 'unknown',
          locationId: locationId || 'default_location'
        };

        const newSale = await addSale(saleData);

        const receipt: Receipt = {
          sale: newSale,
          businessName: 'ForkFlow',
          businessAddress: '123 Food Street, Bangalore, Karnataka 560001',
          gstNumber: 'GSTIN29ABCDE1234F1Z5',
          contactNumber: '+91 80 1234 5678',
          email: 'contact@millethomefoods.com'
        };

        setCurrentReceipt(receipt);
        setShowReceipt(true);
      }

      // Clear cart after successful order
      if (isTableBasedOrder && isManagerOrderActive) {
        // Manager order is already cleared in createPartialManagerOrder
      } else {
        clearCart();
      }
      setShowCheckout(false);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    }
  };

  const handleAddItem = (item: CartItem) => {
    if (isTableBasedOrder && isManagerOrderActive) {
      // Use manager order context for table-based orders
      const managerOrderItem = {
        ...item,
        id: item.id || `temp_${Date.now()}_${Math.random()}`,
        menuItemId: item.menuItemId || item.id,
        name: item.name || 'Unknown Item',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        modifications: item.modifications || [],
        notes: item.notes || '',
        portionSize: item.portionSize || 'full'
      };
      addItemToManagerOrder(managerOrderItem);
    } else {
      // Use regular cart for takeaway orders
      addItem(item);
    }
  };

  const updateItemInManagerOrder = (itemId: string, newQuantity: number) => {
    updateItemQuantity(itemId, newQuantity);
  };

  // Get table display name
  const getTableDisplayName = () => {
    if (tableNames && tableNames.length > 0) {
      return tableNames.join(', ');
    }
    
    if (tableIds && tableIds.length > 0) {
      const tableNumbers = tableIds.map(id => {
        const tableMatch = id.match(/table-(\d+)/i);
        if (tableMatch) {
          return `Table ${tableMatch[1]}`;
        }
        if (/^\d+$/.test(id)) {
          return `Table ${id}`;
        }
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `Table ${numberMatch[0]}`;
        }
        return id;
      });
      return tableNumbers.join(', ');
    }
    
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout title="Manager POS">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading menu items...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Manager POS">
        <ErrorAlert message={error} />
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout title="Manager POS">
        <div className="space-y-4 lg:space-y-6">
          {/* Order Info - Mobile Compact */}
          {isTableBasedOrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 lg:p-4">
              {/* Mobile Header */}
              <div className="flex items-center justify-between lg:hidden mb-2">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900">
                    {orderType === 'dinein' ? 'Dine In' : 'Delivery'} Order
                  </h3>
                  <p className="text-xs text-blue-700">
                    Table: {getTableDisplayName()}
                  </p>
                  {isOngoingOrder && (
                    <p className="text-xs text-blue-600">Editing ongoing order</p>
                  )}
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  Back
                </button>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {orderType === 'dinein' ? 'Dine In' : 'Delivery'} Order
                  </h3>
                  <p className="text-blue-700">
                    Table: {getTableDisplayName()}
                  </p>
                  {isOngoingOrder && (
                    <p className="text-sm text-blue-600">Editing ongoing order</p>
                  )}
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Search and Filters - Mobile Optimized */}
          <div className="bg-white shadow rounded-lg p-3 lg:p-4">
            {/* Mobile Filters - Compact */}
            <div className="lg:hidden space-y-3">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={16} className="text-gray-500" />}
                className="text-sm"
              />
              
              {/* Mobile Filter Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0 min-w-[120px]"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowOutOfStock(!showOutOfStock)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex-shrink-0 whitespace-nowrap ${
                    showOutOfStock 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showOutOfStock ? 'In Stock' : 'All Items'}
                </button>

                <button
                  onClick={() => setUseOptimizedView(!useOptimizedView)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 flex-shrink-0 whitespace-nowrap ${
                    useOptimizedView 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {useOptimizedView ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {useOptimizedView ? 'List' : 'Grid'}
                </button>
              </div>
            </div>

            {/* Desktop Filters */}
            <div className="hidden lg:flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowOutOfStock(!showOutOfStock)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showOutOfStock 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showOutOfStock ? 'Hide Out of Stock' : 'Show Out of Stock'}
              </button>

              <button
                onClick={() => setUseOptimizedView(!useOptimizedView)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  useOptimizedView 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {useOptimizedView ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                {useOptimizedView ? 'Optimized View' : 'Grid View'}
              </button>
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
                Order Summary
                {displayItems.length > 0 && (
                  <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    {displayItems.length}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Layout - Side by Side */}
            <div className="hidden lg:flex lg:gap-6 lg:h-full">
              {/* Products Section - Desktop */}
              <div className="flex-1 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
                <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Menu Items</h2>
                <div className="flex-1 overflow-y-auto">
                  {useOptimizedView ? (
                    <OptimizedProductList 
                      products={filteredProducts} 
                      onAddToCart={(product) => {
                        const menuItem = filteredProducts.find(item => item.id === product.id);
                        if (menuItem) {
                          handleAddToCart(menuItem);
                        }
                      }}
                      cartItems={displayItems.map(item => ({
                        id: item.id,
                        product: {
                          id: item.menuItemId,
                          name: item.name,
                          price: item.price,
                          category: '',
                          code: item.menuItemId,
                          description: '',
                          stock: 999,
                          imageUrl: undefined
                        },
                        quantity: item.quantity
                      }))}
                    />
                  ) : (
                    <ProductGrid 
                      products={filteredProducts} 
                      onAddToCart={handleAddToCart}
                    />
                  )}
                </div>
              </div>

              {/* Cart Section - Desktop */}
              <div className="w-96 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                  {isTableBasedOrder && isManagerOrderActive && (
                    <button
                      onClick={handleSavePartialOrder}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Save Order
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <Cart 
                    items={displayItems}
                    subtotal={displaySubtotal}
                    cgst={displayCgst}
                    sgst={displaySgst}
                    total={displayTotal}
                    onCheckout={handleCheckout}
                    onClear={handleClearCart}
                    onUpdateQuantity={(itemId, newQuantity) => {
                      if (isTableBasedOrder && isManagerOrderActive) {
                        if (newQuantity === 0) {
                          removeItemFromManagerOrder(itemId);
                        } else {
                          updateItemQuantity(itemId, newQuantity);
                        }
                      } else {
                        // Regular cart update logic would go here
                        console.log('Update quantity for item:', itemId, newQuantity);
                      }
                    }}
                    onRemoveItem={(itemId) => {
                      if (isTableBasedOrder && isManagerOrderActive) {
                        removeItemFromManagerOrder(itemId);
                      } else {
                        // Regular cart remove logic would go here
                        console.log('Remove item:', itemId);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Layout - Tabbed Content */}
            <div className="flex-1 lg:hidden bg-white shadow rounded-lg overflow-hidden flex flex-col">
              {activeMobileTab === 'menu' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4">
                    {useOptimizedView ? (
                      <OptimizedProductList 
                        products={filteredProducts} 
                        onAddToCart={(product) => {
                          const menuItem = filteredProducts.find(item => item.id === product.id);
                          if (menuItem) {
                            handleAddToCart(menuItem);
                            // Auto-switch to cart tab after adding item
                            setActiveMobileTab('cart');
                          }
                        }}
                        cartItems={displayItems.map(item => ({
                          id: item.id,
                          product: {
                            id: item.menuItemId,
                            name: item.name,
                            price: item.price,
                            category: '',
                            code: item.menuItemId,
                            description: '',
                            stock: 999,
                            imageUrl: undefined
                          },
                          quantity: item.quantity
                        }))}
                      />
                    ) : (
                      <ProductGrid 
                        products={filteredProducts} 
                        onAddToCart={(menuItem) => {
                          handleAddToCart(menuItem);
                          // Auto-switch to cart tab after adding item
                          setActiveMobileTab('cart');
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Mobile Cart Preview */}
                  {displayItems.length > 0 && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Order Total</p>
                          <p className="text-xl font-bold text-green-600">₹{displayTotal}</p>
                        </div>
                        <button
                          onClick={() => setActiveMobileTab('cart')}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Cart ({displayItems.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeMobileTab === 'cart' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4">
                    <Cart 
                      items={displayItems}
                      subtotal={displaySubtotal}
                      cgst={displayCgst}
                      sgst={displaySgst}
                      total={displayTotal}
                      onCheckout={handleCheckout}
                      onClearCart={handleClearCart}
                      onUpdateQuantity={(itemId, newQuantity) => {
                        if (isTableBasedOrder && isManagerOrderActive) {
                          if (newQuantity === 0) {
                            removeItemFromManagerOrder(itemId);
                          } else {
                            updateItemQuantity(itemId, newQuantity);
                          }
                        } else {
                          console.log('Update quantity for item:', itemId, newQuantity);
                        }
                      }}
                      onRemoveItem={(itemId) => {
                        if (isTableBasedOrder && isManagerOrderActive) {
                          removeItemFromManagerOrder(itemId);
                        } else {
                          console.log('Remove item:', itemId);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Mobile Cart Actions */}
                  <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                    {isTableBasedOrder && isManagerOrderActive && (
                      <button
                        onClick={handleSavePartialOrder}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Save Order
                      </button>
                    )}
                    <button
                      onClick={() => setActiveMobileTab('menu')}
                      className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          items={displayItems}
          subtotal={displaySubtotal}
          cgst={displayCgst}
          sgst={displaySgst}
          total={displayTotal}
          onConfirm={handleConfirmCheckout}
          cgstRate={cgstRate}
          sgstRate={sgstRate}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && currentReceipt && (
        <ReceiptModal
          receipt={currentReceipt}
          onClose={() => {
            setShowReceipt(false);
            setCurrentReceipt(null);
          }}
        />
      )}

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
    </>
  );
};

export default ManagerPOSPage;