import React, { useState, useRef } from 'react';
import { MenuItem, MenuItemFormData } from '../../types';
import { useCategories } from '../../contexts/CategoryContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';
import { Image, Upload, Leaf, Drumstick } from 'lucide-react';

interface MenuItemFormProps {
  onSubmit: (data: MenuItemFormData) => Promise<void>;
  initialData?: MenuItem;
  onCancel?: () => void;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
  onSubmit,
  initialData,
  onCancel
}) => {
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: initialData?.name || '',
    price: initialData?.price || 0,
    categoryId: initialData?.categoryId || '',
    imageUrl: initialData?.imageUrl || '',
    description: initialData?.description || '',
    isVegetarian: initialData?.isVegetarian ?? true,
    isAvailable: initialData?.isAvailable ?? true,
    preparationTime: initialData?.preparationTime || 15,
    spiceLevel: initialData?.spiceLevel || 'medium'
  });
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) {
      setError('Menu item name is required');
      return;
    }
    
    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    
    if (!formData.categoryId) {
      setError('Category is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    // Validate image URL if provided
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      setError('Please enter a valid image URL');
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      console.error('Error saving menu item:', err);
      setError(err.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const storage = getStorage();
      const storageRef = ref(storage, `menu-items/${Date.now()}_${file.name}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);
      
      setFormData(prev => ({
        ...prev,
        imageUrl: downloadUrl
      }));
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError('')}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Menu Item Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter menu item name"
          required
        />
        
        <Input
          label="Price (₹)"
          type="number"
          name="price"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          min="0"
          step="0.01"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Describe the menu item..."
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prep Time (minutes)
          </label>
          <Input
            type="number"
            name="preparationTime"
            value={formData.preparationTime}
            onChange={handleChange}
            placeholder="15"
            min="1"
            max="120"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Spice Level
          </label>
          <select
            name="spiceLevel"
            value={formData.spiceLevel}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="mild">Mild</option>
            <option value="medium">Medium</option>
            <option value="hot">Hot</option>
            <option value="extra_hot">Extra Hot</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <input
            type="radio"
            id="veg"
            name="isVegetarian"
            checked={formData.isVegetarian}
            onChange={() => setFormData(prev => ({ ...prev, isVegetarian: true }))}
            className="mr-2 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="veg" className="flex items-center text-sm font-medium text-green-700">
            <Leaf size={16} className="mr-1" />
            Vegetarian
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="radio"
            id="non-veg"
            name="isVegetarian"
            checked={!formData.isVegetarian}
            onChange={() => setFormData(prev => ({ ...prev, isVegetarian: false }))}
            className="mr-2 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="non-veg" className="flex items-center text-sm font-medium text-red-700">
            <Drumstick size={16} className="mr-1" />
            Non-Vegetarian
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isAvailable"
            name="isAvailable"
            checked={formData.isAvailable}
            onChange={handleChange}
            className="mr-2 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isAvailable" className="text-sm font-medium text-gray-700">
            Available
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Menu Item Image
        </label>
        
        <div className="mt-1 flex items-center space-x-4">
          {formData.imageUrl ? (
            <div className="relative">
              <img
                src={formData.imageUrl}
                alt="Menu item preview"
                className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                }}
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center"
              >
                <Upload size={18} className="mr-2" />
                Upload Image
              </Button>
              <span className="text-sm text-gray-500">or</span>
              <Input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Enter image URL"
                icon={<Image size={18} className="text-gray-500" />}
              />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {uploadProgress !== null && (
          <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
        >
          {initialData ? 'Update' : 'Add'} Menu Item
        </Button>
      </div>
    </form>
  );
};

export default MenuItemForm;