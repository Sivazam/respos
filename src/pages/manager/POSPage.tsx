import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useCategories } from '../../contexts/CategoryContext';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
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
const TableBasedPOS = React.lazy(() => import('../pos/TableBasedPOSPage'));

const ManagerPOSPage: React.FC = () => {
  const location = useLocation();
  const { categories } = useCategories();
  const { menuItems, loading, error } = useMenuItems(); // Use menu items instead of products for restaurant POS
  const { items, subtotal, cgst, sgst, total, clearCart, addItem, cgstRate, sgstRate } = useCart();
  const { currentUser } = useAuth();
  const { addSale } = useSales();
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
  
  // Get menu items for current location
  const locationMenuItems = useMemo(() => {
    return menuItems.filter(item => 
      item.locationId === currentUser?.locationId && item.isAvailable
    );
  }, [menuItems, currentUser?.locationId]);

  const filteredProducts = useMemo(() => {
    return locationMenuItems.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
      const matchesStock = showOutOfStock || product.isAvailable;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [locationMenuItems, searchTerm, selectedCategory, showOutOfStock]);

  const handleAddToCart = (menuItem: MenuItem) => {
    if (menuItem.hasHalfPortion) {
      setSelectedMenuItem(menuItem);
      setShowPortionModal(true);
    } else {
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
    if (selectedMenuItem) {
      addItem({
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
      {/* Mobile-First Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 lg:p-4 mb-4 lg:mb-6">
        {/* Mobile Header - Compact */}
        <div className="flex items-center justify-between lg:hidden mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Order</p>
              <p className="text-lg font-bold text-green-600">₹{total}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                {items.length} items
              </span>
            )}
          </div>
        </div>

        {/* Mobile Order Info Pills */}
        <div className="flex flex-wrap gap-2 lg:hidden">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Manager POS
          </span>
          {useOptimizedView && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              Optimized View
            </span>
          )}
          {showOutOfStock && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
              Show Unavailable
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
            {items.length ? (
              <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                {items.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Desktop Layout - Side by Side */}
        <div className="hidden lg:flex lg:gap-6 lg:h-full">
          {/* Menu Section - Desktop */}
          <div className={`flex flex-col min-h-0 ${hasCartItems ? 'flex-1' : 'w-full'}`}>
            {error && <ErrorAlert message={error} />}
            
            <div className="bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col h-full">
              <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Menu Items</h2>
              
              {/* Search and Filters - Desktop */}
              <div className="mb-4 space-y-3 flex-shrink-0">
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
                
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Categories */}
                  <div className="flex gap-2 overflow-x-auto flex-1">
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

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <p className="text-lg mb-2">No menu items found</p>
                      {!showOutOfStock && (
                        <p className="text-sm">Try enabling "Show unavailable" to see more items</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    {useOptimizedView ? (
                      <OptimizedProductList
                        products={filteredProducts.map(item => ({
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          category: categories.find(cat => cat.id === item.categoryId)?.name || 'Uncategorized',
                          code: item.id,
                          description: item.description,
                          stock: item.isAvailable ? 999 : 0,
                          imageUrl: item.imageUrl
                        }))}
                        onAddToCart={(product, quantity) => {
                          const menuItem = filteredProducts.find(item => item.id === product.id);
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
            </div>
          </div>

          {/* Cart Section - Desktop */}
          {hasCartItems && (
            <div className="w-96 bg-white shadow rounded-lg p-4 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold">Current Order</h2>
                <span className="text-sm text-gray-500">
                  {items.length} items
                </span>
              </div>
              <div className="h-auto lg:h-full">
                <Cart onCheckout={handleCheckout} />
              </div>
            </div>
          )}
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
                
                <div className="flex flex-col gap-3">
                  {/* Mobile Categories */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
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

                  {/* Mobile Toggles */}
                  <div className="flex gap-4 justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show unavailable:</span>
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

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Optimized:</span>
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
              </div>

              {/* Mobile Products */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <p className="text-lg mb-2">No menu items found</p>
                      {!showOutOfStock && (
                        <p className="text-sm">Try enabling "Show unavailable" to see more items</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    {useOptimizedView ? (
                      <OptimizedProductList
                        products={filteredProducts.map(item => ({
                          id: item.id,
                          name: item.name,
                          price: item.price,
                          category: categories.find(cat => cat.id === item.categoryId)?.name || 'Uncategorized',
                          code: item.id,
                          description: item.description,
                          stock: item.isAvailable ? 999 : 0,
                          imageUrl: item.imageUrl
                        }))}
                        onAddToCart={(product, quantity) => {
                          const menuItem = filteredProducts.find(item => item.id === product.id);
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
                        onAddToCart={(menuItem) => {
                          handleAddToCart(menuItem);
                          // Auto-switch to cart tab after adding item
                          setActiveMobileTab('cart');
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
              
              {/* Mobile Cart Preview */}
              {items.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Order Total</p>
                      <p className="text-xl font-bold text-green-600">₹{total}</p>
                    </div>
                    <button
                      onClick={() => setActiveMobileTab('cart')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Cart ({items.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMobileTab === 'cart' && (
            <div className="flex-1 bg-white rounded-b-lg shadow-sm p-3 overflow-hidden flex flex-col">
              {items.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Current Order</h2>
                    <span className="text-sm text-gray-500">
                      {items.length} items
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto mb-4">
                    <Cart onCheckout={handleCheckout} />
                  </div>

                  {/* Mobile Cart Actions */}
                  <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                    <button
                      onClick={handleCheckout}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Proceed to Checkout
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActiveMobileTab('menu')}
                        className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Add Items
                      </button>
                      <button
                        onClick={() => clearCart()}
                        className="bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        Clear Cart
                      </button>
                    </div>
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

export default ManagerPOSPage;