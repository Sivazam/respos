import React, { useState, useMemo } from 'react';
import { Search, ToggleLeft, ToggleRight, Grid, List } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useAuth } from '../../contexts/AuthContext';
import ProductCatalogGrid from '../../components/pos/ProductCatalogGrid';
import OptimizedProductList from '../../components/pos/OptimizedProductList';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';

const ProductCatalogPage: React.FC = () => {
  const { menuItems, loading, error, getMenuItemsForLocation } = useMenuItems();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [useOptimizedView, setUseOptimizedView] = useState(false);
  
  // Get menu items for current location
  const locationMenuItems = useMemo(() => {
    return getMenuItemsForLocation(currentUser?.locationId);
  }, [menuItems, currentUser?.locationId, getMenuItemsForLocation]);
  
  const filteredProducts = useMemo(() => {
    return locationMenuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
      const matchesStock = showOutOfStock || item.isAvailable;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [locationMenuItems, searchTerm, selectedCategory, showOutOfStock]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  return (
    <DashboardLayout title="Product Catalog">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search menu items by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-center">
              {/* Categories */}
              <div className="flex-1">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0
                      transition-all duration-200 border
                      ${!selectedCategory
                        ? 'bg-green-100 text-green-800 border-green-300 transform scale-105 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
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
                        px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0
                        transition-all duration-200 border
                        ${selectedCategory === category.id
                          ? 'bg-green-100 text-green-800 border-green-300 transform scale-105 shadow-sm'
                          : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }
                      `}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                {/* Out of Stock Toggle */}
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
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

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm text-gray-600 whitespace-nowrap">View:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setUseOptimizedView(false)}
                      className={`p-1.5 rounded transition-colors duration-200 ${
                        !useOptimizedView 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title="Grid View"
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      onClick={() => setUseOptimizedView(true)}
                      className={`p-1.5 rounded transition-colors duration-200 ${
                        useOptimizedView 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                      title="List View"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> items
              </span>
              {selectedCategory && (
                <span className="text-sm text-green-600 font-medium">
                  Category: {getCategoryName(selectedCategory)}
                </span>
              )}
              {searchTerm && (
                <span className="text-sm text-blue-600 font-medium">
                  Search: "{searchTerm}"
                </span>
              )}
            </div>
            {!showOutOfStock && (
              <span className="text-xs text-gray-500">
                Hiding unavailable items
              </span>
            )}
          </div>
        </div>

        {/* Products Display */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading menu items...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <div className="text-gray-400 mb-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Search size={32} className="text-gray-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? `No items match your search for "${searchTerm}"`
                    : selectedCategory 
                    ? `No items found in "${getCategoryName(selectedCategory)}" category`
                    : 'No menu items available'
                  }
                </p>
                {!showOutOfStock && (
                  <button
                    onClick={() => setShowOutOfStock(true)}
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Show unavailable items
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="transition-all duration-300">
              {useOptimizedView ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <OptimizedProductList
                    products={filteredProducts.map(item => ({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      category: getCategoryName(item.categoryId),
                      code: item.id,
                      description: item.description,
                      stock: item.isAvailable ? 999 : 0,
                      imageUrl: item.imageUrl
                    }))}
                    onAddToCart={() => {}} // No cart functionality in catalog view
                    cartItems={[]}
                  />
                </div>
              ) : (
                <ProductCatalogGrid
                  products={filteredProducts}
                  category={selectedCategory}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProductCatalogPage;