import React, { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { MenuItem } from '../../types';
import { Search, Eye, EyeOff, Leaf, Drumstick, Clock, IndianRupee, Plus, Edit, Trash2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import MenuItemForm from '../../components/menu/MenuItemForm';
import toast from 'react-hot-toast';

const ManagerMenuPage: React.FC = () => {
  const { menuItems, loading, error, updateMenuItem, addMenuItem, deleteMenuItem } = useMenuItems();
  const { categories } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleAvailability = async (item: MenuItem) => {
    setUpdating(item.id);
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(`${item.name} marked as ${!item.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setUpdating(null);
    }
  };

  const handleAddItem = async (itemData: Omit<MenuItem, 'id'>) => {
    try {
      await addMenuItem(itemData);
      setShowAddForm(false);
      toast.success('Menu item added successfully');
    } catch (error) {
      console.error('Error adding menu item:', error);
      toast.error('Failed to add menu item');
    }
  };

  const handleEditItem = async (itemData: Omit<MenuItem, 'id'>) => {
    if (!editingItem) return;
    
    try {
      await updateMenuItem(editingItem.id, itemData);
      setEditingItem(null);
      toast.success('Menu item updated successfully');
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error('Failed to update menu item');
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }
    
    try {
      await deleteMenuItem(item.id);
      toast.success('Menu item deleted successfully');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <DashboardLayout title="Menu Items">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        {/* Header and Search */}
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
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            Add Menu Item
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingItem) && (
          <div className="bg-white border rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <MenuItemForm
              onSubmit={editingItem ? handleEditItem : handleAddItem}
              initialData={editingItem}
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
              {searchTerm || selectedCategory ? 'No menu items found' : 'No menu items available.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredItems.map((item) => (
                <div key={item.id} className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${
                  item.isAvailable ? 'border-gray-200' : 'border-red-200 bg-red-50'
                }`}>
                  {item.imageUrl && (
                    <div className="h-48 bg-gray-100 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Menu+Item';
                        }}
                      />
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">Unavailable</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">{item.name}</h3>
                      <div className="flex items-center space-x-2 ml-2">
                        {item.isVegetarian ? (
                          <div className="flex items-center text-green-600">
                            <Leaf size={16} />
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <Drumstick size={16} />
                          </div>
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
                      <div>
                        <div className="flex items-center text-lg font-bold text-green-600">
                          <IndianRupee size={16} className="mr-1" />
                          {item.price.toFixed(2)}
                        </div>
                        {item.hasHalfPortion && (
                          <div className="flex items-center text-sm text-gray-500">
                            <IndianRupee size={12} className="mr-1" />
                            {item.halfPortionCost?.toFixed(2)} (Half)
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        
                        {/* Availability Toggle */}
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          disabled={updating === item.id}
                          className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                            updating === item.id
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : item.isAvailable
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {updating === item.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-current"></div>
                          ) : item.isAvailable ? (
                            <>
                              <Eye size={12} className="sm:size-[14px]" />
                              <span className="hidden sm:inline">Available</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} className="sm:size-[14px]" />
                              <span className="hidden sm:inline">Unavailable</span>
                            </>
                          )}
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

        {/* Legend */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-800 mb-2">Manager Access</h3>
          <p className="text-sm text-green-600">
            As a manager, you have full control over menu items. You can add new items, edit existing ones, 
            delete items, and toggle their availability status.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManagerMenuPage;