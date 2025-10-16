import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import ProductGrid from '../../components/pos/ProductGrid';
import OptimizedProductList from '../../components/pos/OptimizedProductList';
import Cart from '../../components/pos/Cart';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import CheckoutModal from '../../components/pos/CheckoutModal';
import ReceiptModal from '../../components/pos/ReceiptModal';
import PortionSelectionModal from '../../components/pos/PortionSelectionModal';
import { Sale, Receipt, MenuItem } from '../../types';

// Lazy load components outside the component to avoid recreation on every render
const ManagerPOS = React.lazy(() => import('./ManagerPOSPage'));
const TableBasedPOS = React.lazy(() => import('./TableBasedPOSPage'));

const POSPage: React.FC = () => {
  const location = useLocation();
  const { menuItems, loading, error } = useMenuItems();
  const { categories } = useCategories();
  const { items, subtotal, cgst, sgst, total, clearCart, addItem, cgstRate, sgstRate } = useCart();
  const { currentUser } = useAuth();
  const { addSale } = useSales();
  
  console.log('🔍 POSPage rendering - User role:', currentUser?.role, 'User:', currentUser);
  
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
  
  // Check if current user is a manager and this is a table-based order
  const isManagerTableOrder = isTableBasedOrder && currentUser?.role === 'manager';
  
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

  // If manager is creating a table-based order, redirect to ManagerPOSPage
  if (isManagerTableOrder) {
    console.log('👨‍💼 Redirecting manager to ManagerPOSPage');
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }>
        <ManagerPOS />
      </React.Suspense>
    );
  }

  const handleAddToCart = (menuItem: MenuItem) => {
    console.log('🛒 POSPage.handleAddToCart called:', menuItem);
    if (menuItem.hasHalfPortion) {
      console.log('🍽️ Item has half portion, showing modal');
      setSelectedMenuItem(menuItem);
      setShowPortionModal(true);
    } else {
      console.log('📦 Item does not have half portion, adding directly');
      addItem({
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
    console.log('🍽️ POSPage.handlePortionSelect called:', { portionSize, price, selectedMenuItem });
    if (selectedMenuItem) {
      addItem({
        menuItemId: selectedMenuItem.id,
        name: selectedMenuItem.name,
        price: price,
        portionSize: portionSize,
        modifications: [],
        notes: ''
      });
      console.log('🛒 Added item with portionSize:', portionSize);
      // Close the modal and clear selection
      setShowPortionModal(false);
      setSelectedMenuItem(null);
    }
  };

  const handleCheckout = () => {
    if (items.length > 0) {
      setShowCheckout(true);
    }
  };

  const handleConfirmCheckout = async (paymentMethod: Sale['paymentMethod']) => {
    if (!currentUser) return;

    try {
      // Get the current location - try multiple sources
      const locationId = currentUser.locationId;
      
      // If no locationId in currentUser, try to get it from other sources
      if (!locationId) {
        // For now, we'll use a default or get it from localStorage/auth context
        // This should be properly handled by the auth context
        console.warn('No locationId found in currentUser, this may cause issues');
      }

      const saleData: Omit<Sale, 'id' | 'createdAt' | 'invoiceNumber'> = {
        items: items.map(item => ({
          ...item,
          // Ensure all required fields are present and not undefined
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

      console.log('Sale data being sent:', saleData);
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
      setShowCheckout(false);
      setShowReceipt(true);
      clearCart();
    } catch (error) {
      console.error('Failed to process sale:', error);
    }
  };

  // Check if cart has items to determine layout
  const hasCartItems = items.length > 0;

  // If this is a table-based order, redirect to the table-based POS
  if (isTableBasedOrder) {
    // Render the table-based POS
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }>
        <TableBasedPOS />
      </React.Suspense>
    );
  }

  return (
    <DashboardLayout title="Point of Sale">
      <div className={`flex flex-col gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-8rem)] ${hasCartItems ? 'lg:flex-row' : ''}`}>
        {/* Products Section */}
        <div className={`flex flex-col min-h-0 ${hasCartItems ? 'flex-1' : 'w-full'}`}>
          {error && <ErrorAlert message={error} />}
          
          <div className="mb-4 lg:mb-6 space-y-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`
                    px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0
                    transition-all duration-200
                    ${!selectedCategory
                      ? 'bg-green-100 text-green-800 transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0
                      transition-all duration-200
                      ${selectedCategory === category.id
                        ? 'bg-green-100 text-green-800 transform scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Out of Stock Toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">Show unavailable:</span>
                <button
                  onClick={() => setShowOutOfStock(!showOutOfStock)}
                  className="flex items-center transition-colors duration-200"
                >
                  {showOutOfStock ? (
                    <ToggleRight className="h-6 w-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Optimized View Toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-gray-600 whitespace-nowrap">Optimized:</span>
                <button
                  onClick={() => setUseOptimizedView(!useOptimizedView)}
                  className="flex items-center transition-colors duration-200"
                >
                  {useOptimizedView ? (
                    <ToggleRight className="h-6 w-6 text-blue-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No menu items found</p>
                {!showOutOfStock && (
                  <p className="text-sm">Try enabling "Show out of stock" to see more items</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {useOptimizedView ? (
                <OptimizedProductList
                  products={filteredProducts.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    category: categories.find(cat => cat.id === item.categoryId)?.name || 'Uncategorized',
                    code: item.id,
                    description: item.description,
                    stock: item.isAvailable ? 999 : 0, // Use availability as stock indicator
                    imageUrl: item.imageUrl
                  }))}
                  onAddToCart={(product, quantity) => {
                    console.log('🛒 OptimizedProductList.onAddToCart called:', { product, quantity });
                    // Find the corresponding menu item and add to cart
                    const menuItem = filteredProducts.find(item => item.id === product.id);
                    console.log('🔍 Found corresponding menu item:', menuItem);
                    if (menuItem) {
                      handleAddToCart(menuItem);
                    }
                  }}
                  cartItems={items.map(item => ({
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
                  category={selectedCategory}
                  onAddToCart={handleAddToCart}
                />
              )}
            </div>
          )}
        </div>

        {/* Cart Section - Only show when there are items */}
        {hasCartItems && (
          <div className="w-full lg:w-96 bg-white rounded-lg shadow-lg p-4 lg:p-6 order-first lg:order-last max-h-[50vh] lg:max-h-none overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Current Sale</h2>
            <div className="h-auto lg:h-full">
              <Cart onCheckout={handleCheckout} />
            </div>
          </div>
        )}

        {/* Empty Cart Message - Show when no items and on mobile */}
        {!hasCartItems && (
          <div className="lg:hidden bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-gray-500">Add items to start a sale</p>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          subtotal={subtotal}
          cgst={cgst}
          sgst={sgst}
          total={total}
          cgstRate={cgstRate}
          sgstRate={sgstRate}
          onConfirm={handleConfirmCheckout}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceipt && currentReceipt && (
        <ReceiptModal
          receipt={currentReceipt}
          onClose={() => setShowReceipt(false)}
          onPrint={() => {}} // Print function is now handled internally
        />
      )}

      {/* Portion Selection Modal */}
      {selectedMenuItem && (
        <>
          {console.log('🔍 POSPage rendering PortionSelectionModal:', { selectedMenuItem, showPortionModal })}
          <PortionSelectionModal
            menuItem={selectedMenuItem}
            isOpen={showPortionModal}
            onClose={() => {
              console.log('🔍 POSPage closing modal');
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

export default POSPage;