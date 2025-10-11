import React, { useState, useRef } from 'react';
import { Product, ProductFormData } from '../../types';
import { useCategories } from '../../contexts/CategoryContext';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';
import { Image, Upload } from 'lucide-react';

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: Product;
  onCancel?: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onSubmit,
  initialData,
  onCancel
}) => {
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    price: initialData?.price || 0,
    categoryId: initialData?.categoryId || '',
    imageUrl: initialData?.imageUrl || ''
  });
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) {
      setError('Product name is required');
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

    // Validate image URL if provided
    if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
      setError('Please enter a valid image URL');
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
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
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      
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
      
      <Input
        label="Product Name"
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter product name"
        required
      />
      
      <Input
        label="Price"
        type="number"
        name="price"
        value={formData.price}
        onChange={handleChange}
        placeholder="0.00"
        min="0"
        step="0.01"
        required
      />
      
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
          Product Image
        </label>
        
        <div className="mt-1 flex items-center space-x-4">
          {formData.imageUrl ? (
            <div className="relative">
              <img
                src={formData.imageUrl}
                alt="Product preview"
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
          {initialData ? 'Update' : 'Add'} Product
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;