import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useCategories } from '../../contexts/CategoryContext';
import { Category } from '../../types';
import CategoryForm from '../../components/inventory/CategoryForm';
import CategoryList from '../../components/inventory/CategoryList';
import Button from '../../components/ui/Button';
import ErrorAlert from '../../components/ui/ErrorAlert';

const SuperAdminCategoryPage: React.FC = () => {
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      try {
        await deleteCategory(category.id);
      } catch (err) {
        console.error('Failed to delete category:', err);
      }
    }
  };

  const handleSubmit = async (name: string, description?: string) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, name, description);
      } else {
        await addCategory(name, description);
      }
      setShowForm(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('Failed to save category:', err);
    }
  };

  return (
    <DashboardLayout title="Category Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setEditingCategory(null);
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-1" />
            Add Category
          </Button>
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <CategoryForm
              onSubmit={handleSubmit}
              initialData={editingCategory || undefined}
              onCancel={() => {
                setShowForm(false);
                setEditingCategory(null);
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No categories added yet.
              </div>
            ) : (
              <CategoryList
                categories={categories}
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

export default SuperAdminCategoryPage;