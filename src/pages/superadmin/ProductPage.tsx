import React, { useState } from 'react';
import { Plus, Search, FolderPlus } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { Product } from '../../types';
import ProductForm from '../../components/inventory/ProductForm';
import ProductList from '../../components/inventory/ProductList';
import CategoryForm from '../../components/inventory/CategoryForm';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';

const SuperAdminProductPage: React.FC = () => {
  const { products, loading, error, addProduct, updateProduct, deleteProduct } = useProducts();
  const { categories, addCategory } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        await deleteProduct(product.id);
      } catch (err) {
        console.error('Failed to delete product:', err);
      }
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          ...data,
          quantity: editingProduct.quantity // Preserve existing quantity
        });
      } else {
        await addProduct({
          ...data,
          quantity: 0 // New products start with 0 quantity
        });
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to save product:', err);
    }
  };

  const handleCategorySubmit = async (name: string, description: string | null) => {
    try {
      await addCategory(name, description || undefined);
      setShowCategoryForm(false);
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout title="Product Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCategoryForm(true)}
            >
              <FolderPlus size={18} className="mr-1" />
              Add Category
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
            >
              <Plus size={18} className="mr-1" />
              Add Product
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              ${!selectedCategory
                ? 'bg-green-100 text-green-800'
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
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                ${selectedCategory === category.id
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {category.name}
            </button>
          ))}
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <ProductForm
              onSubmit={handleSubmit}
              initialData={editingProduct || undefined}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </div>
        ) : showCategoryForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
            <CategoryForm
              onSubmit={handleCategorySubmit}
              onCancel={() => setShowCategoryForm(false)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No products found matching your search.' : 'No products added yet.'}
              </div>
            ) : (
              <ProductList
                products={filteredProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminProductPage;