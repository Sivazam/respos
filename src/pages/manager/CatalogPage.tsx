import React, { useState, useMemo } from 'react';
import { Search, ToggleLeft, ToggleRight, Grid, List, Leaf, Drumstick } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useAuth } from '../../contexts/AuthContext';
import ProductCatalogGrid from '../../components/pos/ProductCatalogGrid';
import OptimizedProductList from '../../components/pos/OptimizedProductList';
import ErrorAlert from '../../components/ui/ErrorAlert';

const ManagerCatalogPage: React.FC = () => {
  const { menuItems, loading, error, getMenuItemsForLocation } = useMenuItems();
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [useOptimizedView, setUseOptimizedView] = useState(false);
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  
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
      const matchesVegFilter = vegFilter === 'all' || 
                             (vegFilter === 'veg' && item.isVegetarian) || 
                             (vegFilter === 'non-veg' && !item.isVegetarian);
      return matchesSearch && matchesCategory && matchesStock && matchesVegFilter;
    });
  }, [locationMenuItems, searchTerm, selectedCategory, showOutOfStock, vegFilter]);

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  return (
    <DashboardLayout title="Product Catalog">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
              />
            </div>
            
            <div className="flex flex-col space-y-4">
              {/* Categories - Horizontal scroll on mobile */}
              <div className="w-full">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`
                      px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0
                      transition-all duration-200 border
                      ${!selectedCategory
                        ? 'bg-green-100 text-green-800 border-green-300 transform scale-105 shadow-sm'
                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                      }
                    `}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`
                        px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0
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

              {/* Filter Controls - Stack on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Veg/Non-Veg Filter */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setVegFilter('all')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      vegFilter === 'all' 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setVegFilter('veg')}
                    className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      vegFilter === 'veg' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <Leaf size={12} className="sm:size-14" />
                    <span className="hidden sm:inline">Veg</span>
                  </button>
                  <button
                    onClick={() => setVegFilter('non-veg')}
                    className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      vegFilter === 'non-veg' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    <Drumstick size={12} className="sm:size-14" />
                    <span className="hidden sm:inline">Non-Veg</span>
                  </button>
                </div>

                {/* Toggles */}
                <div className="flex gap-3 sm:gap-4">
                  {/* Out of Stock Toggle */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Show unavailable:</span>
                    <button
                      onClick={() => setShowOutOfStock(!showOutOfStock)}
                      className="flex items-center transition-colors duration-200"
                    >
                      {showOutOfStock ? (
                        <ToggleRight className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">View:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setUseOptimizedView(false)}
                        className={`p-1 sm:p-1.5 rounded transition-colors duration-200 ${
                          !useOptimizedView 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                        title="Grid View"
                      >
                        <Grid size={14} className="sm:size-16" />
                      </button>
                      <button
                        onClick={() => setUseOptimizedView(true)}
                        className={`p-1 sm:p-1.5 rounded transition-colors duration-200 ${
                          useOptimizedView 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                        }`}
                        title="List View"
                      >
                        <List size={14} className="sm:size-16" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> items
              </span>
              {selectedCategory && (
                <span className="text-xs sm:text-sm text-green-600 font-medium truncate max-w-[120px] sm:max-w-none">
                  {getCategoryName(selectedCategory)}
                </span>
              )}
              {vegFilter !== 'all' && (
                <span className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${
                  vegFilter === 'veg' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {vegFilter === 'veg' ? <Leaf size={12} /> : <Drumstick size={12} />}
                  <span className="hidden sm:inline">{vegFilter === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}</span>
                  <span className="sm:hidden">{vegFilter === 'veg' ? 'Veg' : 'Non-Veg'}</span>
                </span>
              )}
              {searchTerm && (
                <span className="text-xs sm:text-sm text-blue-600 font-medium truncate max-w-[100px] sm:max-w-none">
                  "{searchTerm}"
                </span>
              )}
            </div>
            {!showOutOfStock && (
              <span className="text-xs text-gray-500">
                Hiding unavailable
              </span>
            )}
          </div>
        </div>

        {/* Products Display */}
        <div className="min-h-[300px] sm:min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12 sm:py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-green-600 mb-3 sm:mb-4"></div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">Loading menu items...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12 sm:py-20 px-4">
              <div className="text-center max-w-sm">
                <div className="text-gray-400 mb-3 sm:mb-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Search size={24} className="sm:size-32 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No menu items found</h3>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  {searchTerm 
                    ? `No items match "${searchTerm}"`
                    : selectedCategory 
                    ? `No items in "${getCategoryName(selectedCategory)}"`
                    : vegFilter !== 'all'
                    ? `No ${vegFilter === 'veg' ? 'vegetarian' : 'non-vegetarian'} items`
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

export default ManagerCatalogPage;