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
import ProductGrid from '../../components/pos/ProductGrid';
import OptimizedProductList from '../../components/pos/OptimizedProductList';
import Cart from '../../components/pos/Cart';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import CheckoutModal from '../../components/pos/CheckoutModal';
import ReceiptModal from '../../components/pos/ReceiptModal';
import { Sale, Receipt } from '../../types';
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
    isTemporaryOrderActive, 
    temporaryOrder,
    startTemporaryOrder, 
    loadOrderIntoCart,
    checkForExistingOrder 
  } = useTemporaryOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [useOptimizedView, setUseOptimizedView] = useState(false);
  
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

  // Initialize temporary order when component mounts
  useEffect(() => {
    console.log('🔍 Manager POS Page - orderContext:', { orderType, tableIds, isOngoingOrder, orderId });
    
    if (isTableBasedOrder && !isTemporaryOrderActive) {
      const initializeOrder = async () => {
        try {
          let existingOrder = null;
          
          // If we have a specific order ID, try to load it first
          if (orderId) {
            console.log('📦 Manager loading order by ID:', orderId);
            existingOrder = await loadOrderIntoCart(orderId);
            console.log('✅ Manager loaded order by ID into cart:', existingOrder);
          }
          
          // If no specific order found, check for existing order on tables
          if (!existingOrder) {
            existingOrder = await checkForExistingOrder(tableIds);
            console.log('🔍 Manager found existing order by table:', existingOrder);
            
            if (existingOrder) {
              // Load the existing order into the cart
              await loadOrderIntoCart(existingOrder.id);
            }
          }
          
          if (!existingOrder) {
            // Start a new temporary order
            await startTemporaryOrder(tableIds, orderType);
            console.log('🆕 Manager started new temporary order');
          }
        } catch (error) {
          console.error('Manager failed to initialize order:', error);
          toast.error('Failed to initialize order');
        }
      };
      initializeOrder();
    }
  }, [isTableBasedOrder, isTemporaryOrderActive, tableIds, orderType, orderId, loadOrderIntoCart, checkForExistingOrder, startTemporaryOrder]);

  const handleCheckout = () => {
    if (items.length > 0) {
      setShowCheckout(true);
    }
  };

  const handleConfirmCheckout = async (paymentMethod: Sale['paymentMethod']) => {
    if (!currentUser) return;

    try {
      // Get the current location
      const locationId = currentUser.locationId;

      if (isTableBasedOrder) {
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
      clearCart();
      setShowCheckout(false);

    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order. Please try again.');
    }
  };

  const handleClearCart = () => {
    clearCart();
    toast.success('Cart cleared');
  };

  const handleAddItem = (item: any) => {
    addItem(item);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Menu Items</h2>
                {useOptimizedView ? (
                  <OptimizedProductList 
                    products={filteredProducts} 
                    onAddItem={handleAddItem}
                  />
                ) : (
                  <ProductGrid 
                    products={filteredProducts} 
                    onAddItem={handleAddItem}
                  />
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="lg:col-span-1">
              <Cart 
                items={items}
                subtotal={subtotal}
                cgst={cgst}
                sgst={sgst}
                total={total}
                onCheckout={handleCheckout}
                onClearCart={handleClearCart}
                cgstRate={cgstRate}
                sgstRate={sgstRate}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          items={items}
          subtotal={subtotal}
          cgst={cgst}
          sgst={sgst}
          total={total}
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
    </>
  );
};

export default ManagerPOSPage;