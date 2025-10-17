import React from 'react';
import { MenuItem } from '../../types';
import { Plus } from 'lucide-react';

interface ProductGridProps {
  products: MenuItem[];
  category?: string;
  onAddToCart?: (product: MenuItem) => void;
  onAddItem?: (product: MenuItem) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, category, onAddToCart, onAddItem }) => {
  const handleAddToCart = onAddToCart || onAddItem;
  
  const filteredProducts = category
    ? products.filter(product => product.categoryId === category)
    : products;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
      {filteredProducts.map(product => (
        <button
          key={product.id}
          onClick={() => product.isAvailable && handleAddToCart && handleAddToCart(product)}
          disabled={!product.isAvailable || !handleAddToCart}
          className={`
            relative p-2 sm:p-3 lg:p-4 rounded-lg text-left transition-all h-full min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] xl:min-h-[200px] overflow-hidden
            ${product.isAvailable 
              ? product.hasHalfPortion
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 shadow-sm hover:shadow-md transform hover:-translate-y-1 border border-amber-200 hover:border-orange-300 cursor-pointer'
                : 'bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transform hover:-translate-y-1 border border-gray-200 hover:border-green-300 cursor-pointer'
              : 'bg-gray-50 border border-gray-200 cursor-not-allowed opacity-60'
            }
          `}
        >
          {/* Portion indicator badge */}
          {product.hasHalfPortion && product.isAvailable && (
            <div className="absolute top-2 right-2 z-10">
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                ½ Portion
              </div>
            </div>
          )}
            <div className="flex flex-col h-full">
            {product.imageUrl ? (
              <div className="aspect-square w-full mb-2 sm:mb-3 rounded-md overflow-hidden bg-gray-100">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className={`w-full h-full object-cover ${product.isAvailable ? 'transition-transform duration-300 hover:scale-105' : 'grayscale'}`}
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                  }}
                />
              </div>
            ) : (
              <div className={`aspect-square w-full mb-2 sm:mb-3 rounded-md flex items-center justify-center ${
                product.isAvailable ? 'bg-gray-200' : 'bg-gray-300'
              }`}>
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1 sm:mb-2">
                <h3 className={`font-medium leading-tight text-xs sm:text-sm lg:text-base line-clamp-2 flex-1 pr-1 ${
                  product.isAvailable ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {product.name}
                </h3>
              </div>

              <div className="mt-auto">
                {/* Portion pricing display */}
                {product.hasHalfPortion ? (
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div className="flex flex-col">
                      <p className={`text-xs sm:text-sm font-semibold ${
                        product.isAvailable ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        Full: ₹{product.price.toFixed(2)}
                      </p>
                      <p className={`text-xs font-medium ${
                        product.isAvailable ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        Half: ₹{(product.price * 0.6).toFixed(2)}
                      </p>
                    </div>
                    
                    {product.isAvailable ? (
                      <div className={`${product.hasHalfPortion ? 'bg-amber-100' : 'bg-green-100'} rounded-full p-1.5 sm:p-2 lg:p-2.5 flex-shrink-0 transform transition-transform duration-200 hover:scale-110`}>
                        <Plus size={12} className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${product.hasHalfPortion ? 'text-amber-600' : 'text-green-600'}`} />
                      </div>
                    ) : (
                      <div className="bg-red-100 rounded px-1 sm:px-2 py-1 flex-shrink-0">
                        <span className="text-xs font-medium text-red-600">Unavailable</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <p className={`text-xs sm:text-sm font-semibold ${
                      product.isAvailable ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      ₹{product.price.toFixed(2)}
                    </p>
                    
                    {product.isAvailable ? (
                      <div className={`${product.hasHalfPortion ? 'bg-amber-100' : 'bg-green-100'} rounded-full p-1.5 sm:p-2 lg:p-2.5 flex-shrink-0 transform transition-transform duration-200 hover:scale-110`}>
                        <Plus size={12} className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 ${product.hasHalfPortion ? 'text-amber-600' : 'text-green-600'}`} />
                      </div>
                    ) : (
                      <div className="bg-red-100 rounded px-1 sm:px-2 py-1 flex-shrink-0">
                        <span className="text-xs font-medium text-red-600">Unavailable</span>
                      </div>
                    )}
                  </div>
                )}
                
                <p className={`text-xs font-medium ${
                  product.isAvailable ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.isAvailable ? 'Available' : 'Out of Stock'}
                </p>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ProductGrid;