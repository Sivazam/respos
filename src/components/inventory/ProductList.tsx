import React from 'react';
import { Product } from '../../types';
import { useCategories } from '../../contexts/CategoryContext';
import { Edit2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete
}) => {
  const { categories } = useCategories();

  const getCategoryName = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Unknown Category';
  };

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-start space-x-4">
            {/* Product Image */}
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-24 h-24 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                }}
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
            )}

            {/* Product Details */}
            <div className="flex-1">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {product.name}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-500">
                      Category: {getCategoryName(product.categoryId)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Price: ₹{product.price.toFixed(2)}
                    </p>
                    <p className={`text-sm ${
                      product.quantity <= 10 ? 'text-red-600 font-medium' : 'text-gray-500'
                    }`}>
                      Stock: {product.quantity} units
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product)}
                    className="inline-flex items-center"
                  >
                    <Edit2 size={16} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(product)}
                    className="inline-flex items-center"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;