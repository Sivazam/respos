import React from 'react';
import { MenuItem } from '../../types';
import { 
  Clock, 
  ChefHat, 
  Leaf, 
  Flame, 
  Star,
  DollarSign,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ProductCatalogGridProps {
  products: MenuItem[];
  category?: string;
}

const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({ products, category }) => {
  
  const filteredProducts = category
    ? products.filter(product => product.categoryId === category)
    : products;

  const getSpiceLevelColor = (level: string) => {
    switch (level) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hot': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'extra_hot': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSpiceLevelIcon = (level: string) => {
    const count = level === 'mild' ? 1 : level === 'medium' ? 2 : level === 'hot' ? 3 : 4;
    return Array(count).fill(0).map((_, i) => (
      <Flame key={i} size={12} className="text-orange-500" />
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredProducts.map(product => (
        <div
          key={product.id}
          className={`
            bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border
            ${product.isAvailable 
              ? 'border-gray-200 hover:border-green-300 hover:shadow-green-50' 
              : 'border-gray-200 opacity-75'
            }
          `}
        >
          {/* Image Section */}
          <div className="relative h-48 bg-gray-100 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  product.isAvailable ? 'hover:scale-105' : 'grayscale'
                }`}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/300x200?text=No+Image';
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                product.isAvailable ? 'bg-gray-200' : 'bg-gray-300'
              }`}>
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <ChefHat size={32} className="mx-auto" />
                  </div>
                  <span className="text-gray-500 text-sm">No Image</span>
                </div>
              </div>
            )}
            
            {/* Availability Badge */}
            <div className="absolute top-3 right-3">
              {product.isAvailable ? (
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-md">
                  <CheckCircle size={12} />
                  Available
                </div>
              ) : (
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-md">
                  <XCircle size={12} />
                  Unavailable
                </div>
              )}
            </div>

            {/* Vegetarian Badge */}
            {product.isVegetarian !== undefined && (
              <div className="absolute top-3 left-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium shadow-md ${
                  product.isVegetarian 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {product.isVegetarian ? (
                    <div className="flex items-center gap-1">
                      <Leaf size={12} />
                      Vegetarian
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs">🍗</span>
                      Non-Veg
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-5">
            {/* Header */}
            <div className="mb-3">
              <h3 className={`text-lg font-semibold mb-1 ${
                product.isAvailable ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {product.name}
              </h3>
              
              {/* Description */}
              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {product.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                <span className={`text-2xl font-bold ${
                  product.isAvailable ? 'text-green-600' : 'text-gray-400'
                }`}>
                  ₹{product.price.toFixed(2)}
                </span>
              </div>
              
              {product.preparationTime && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>{product.preparationTime} min</span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="space-y-3">
              {/* Spice Level */}
              {product.spiceLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Spice Level:</span>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getSpiceLevelColor(product.spiceLevel)}`}>
                      {product.spiceLevel.charAt(0).toUpperCase() + product.spiceLevel.slice(1)}
                    </div>
                    <div className="flex gap-0.5">
                      {getSpiceLevelIcon(product.spiceLevel)}
                    </div>
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Category:</span>
                <span className="text-sm font-medium text-gray-900">
                  {/* This would need to be passed from parent or looked up */}
                  Menu Item
                </span>
              </div>

              {/* Allergens/Dietary Info */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Dietary:</span>
                <div className="flex items-center gap-2">
                  {product.isVegetarian && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Leaf size={12} />
                      <span className="text-xs">Veg</span>
                    </div>
                  )}
                  {product.spiceLevel === 'mild' && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Info size={12} />
                      <span className="text-xs">Mild</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="pt-2 border-t border-gray-100">
                <div className={`text-center text-sm font-medium ${
                  product.isAvailable ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.isAvailable ? '✓ Ready to Order' : '✗ Currently Unavailable'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductCatalogGrid;