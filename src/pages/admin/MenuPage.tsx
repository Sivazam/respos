import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { MenuItem } from '../../types';
import { Plus, Edit2, Trash2, Search, Leaf, Drumstick, Clock, IndianRupee, Eye, EyeOff } from 'lucide-react';
import MenuItemForm from '../../components/menu/MenuItemForm';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import toast from 'react-hot-toast';

const MenuPage: React.FC = () => {
  const { menuItems, loading, error, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuItems();
  const { categories } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = async (data: any) => {
    try {
      await addMenuItem(data);
      setShowAddForm(false);
    } catch (error) {
      // Error adding menu item
    }
  };

  const handleEditItem = async (data: any) => {
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, data);
        setEditingItem(null);
      }
    } catch (error) {
      // Error updating menu item
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem(id);
      } catch (error) {
        // Error deleting menu item
      }
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    setUpdating(item.id);
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} marked as ${!item.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      // Error updating availability
      toast.error('Failed to update availability');
    } finally {
      setUpdating(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <DashboardLayout title="Menu Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={18} className="text-gray-500" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
          >
            <Plus size={18} className="mr-1" />
            Add Menu Item
          </Button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            <MenuItemForm
              onSubmit={editingItem ? handleEditItem : handleAddItem}
              initialData={editingItem || undefined}
              onCancel={() => {
                setShowAddForm(false);
                setEditingItem(null);
              }}
            />
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading menu items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm || selectedCategory ? 'No menu items found' : 'No menu items yet. Add your first menu item!'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {item.imageUrl && (
                    <div className="h-48 bg-gray-100">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Menu+Item';
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">{item.name}</h3>
                      <div className="flex items-center space-x-2 ml-2">
                        {/* Stock Toggle Button */}
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          disabled={updating === item.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            updating === item.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : item.isAvailable
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={item.isAvailable ? 'Mark as out of stock' : 'Mark as in stock'}
                        >
                          {updating === item.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                          ) : item.isAvailable ? (
                            <>
                              <Eye size={10} />
                              <span className="hidden sm:inline">In Stock</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={10} />
                              <span className="hidden sm:inline">Out of Stock</span>
                            </>
                          )}
                        </button>
                        
                        {item.isVegetarian ? (
                          <div className="flex items-center text-green-600">
                            <Leaf size={16} />
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <Drumstick size={16} />
                          </div>
                        )}
                        {!item.isAvailable && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Unavailable</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Clock size={14} className="mr-1" />
                        {item.preparationTime} min
                      </div>
                      <div className="flex items-center">
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.spiceLevel === 'mild' ? 'bg-green-100 text-green-800' :
                          item.spiceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          item.spiceLevel === 'hot' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.spiceLevel}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-lg font-bold text-green-600">
                        <IndianRupee size={16} className="mr-1" />
                        {item.price.toFixed(2)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {getCategoryName(item.categoryId)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MenuPage;