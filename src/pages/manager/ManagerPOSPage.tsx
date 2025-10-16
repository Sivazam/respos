import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useOrders } from '../../contexts/OrderContext';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { orderService } from '../../services/orderService';
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
import { Sale, Receipt, MenuItem } from '../../types';
import toast from 'react-hot-toast';

const ManagerPOSPage: React.FC = () => {
  const location = useLocation();
  const { menuItems, loading, error } = useMenuItems();
  const { categories } = useCategories();
  const { items, subtotal, cgst, sgst, total, clearCart, addItem, cgstRate, sgstRate } = useCart();
  const { currentUser } = useAuth();
  const { addSale } = useSales();
  const { createOrder } = useOrders();
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
    calculateTotals,
    getTableNames
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

  const handleAddItem = (item: any) => {
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
        <div className="space-y-6">
          {/* Order Info */}
          {isTableBasedOrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
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

          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Main Content */}
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Products */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="bg-white shadow rounded-lg p-3 lg:p-4">
                <h2 className="text-base lg:text-lg font-semibold mb-3 lg:mb-4">Menu Items</h2>
                <div className="max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
                  {useOptimizedView ? (
                    <OptimizedProductList 
                      products={filteredProducts} 
                      onAddToCart={(product, quantity) => {
                        // Find the corresponding menu item and add to cart
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
            </div>

            {/* Cart */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-white shadow rounded-lg p-3 lg:p-4 lg:sticky lg:top-6 max-h-[40vh] lg:max-h-none overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-3 lg:mb-4 flex-shrink-0">
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
                <div className="flex-1 overflow-y-auto min-h-0">
                  <Cart 
                    items={displayItems}
                    subtotal={displaySubtotal}
                    cgst={displayCgst}
                    sgst={displaySgst}
                    total={displayTotal}
                    onCheckout={handleCheckout}
                    onClearCart={handleClearCart}
                    cgstRate={cgstRate}
                    sgstRate={sgstRate}
                  />
                </div>
              </div>
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