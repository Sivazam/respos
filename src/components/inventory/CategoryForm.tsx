import React, { useState } from 'react';
import { Category } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface CategoryFormProps {
  onSubmit: (name: string, description: string | null) => Promise<void>;
  initialData?: Category;
  onCancel?: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  onSubmit,
  initialData,
  onCancel
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit(name.trim(), description.trim() || null);
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
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
        label="Category Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter category name"
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this category"
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={3}
        />
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
          {initialData ? 'Update' : 'Add'} Category
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;