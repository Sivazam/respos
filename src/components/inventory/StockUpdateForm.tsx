import React, { useState } from 'react';
import { Product, StockUpdateFormData } from '../../types';
import { useCategories } from '../../contexts/CategoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatures } from '../../hooks/useFeatures';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface StockUpdateFormProps {
  product: Product;
  onSubmit: (data: StockUpdateFormData) => Promise<void>;
  onCancel: () => void;
}

const StockUpdateForm: React.FC<StockUpdateFormProps> = ({
  product,
  onSubmit,
  onCancel
}) => {
  const { categories } = useCategories();
  const { currentUser } = useAuth();
  const { isEnabled } = useFeatures();
  const [formData, setFormData] = useState<StockUpdateFormData>({
    productId: product.id,
    quantity: 0,
    invoiceNumber: '',
    notes: '',
    type: 'add'
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const category = categories.find(cat => cat.id === product.categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (formData.type === 'reduce' && formData.quantity > product.quantity) {
      setError(`Cannot reduce more than current stock (${product.quantity} units)`);
      return;
    }

    if (formData.type === 'reduce' && !formData.notes.trim()) {
      setError('Please provide a reason for stock reduction');
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit({
        ...formData,
        // Convert quantity to negative for reduction
        quantity: formData.type === 'reduce' ? -formData.quantity : formData.quantity,
        // Clear invoice number for reductions
        invoiceNumber: formData.type === 'reduce' ? '' : formData.invoiceNumber
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) || 0 : value
    }));
  };

  // Check if stock updates are enabled (for simple mode, only additions are allowed)
  const canReduceStock = isEnabled('inventory.stockUpdates');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError('')}
        />
      )}
      
      <div className="bg-gray-50 p-4 rounded-lg flex items-start space-x-4">
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
          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}
        <div>
          <h3 className="font-medium text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Category: {category?.name}</p>
          <p className="text-sm text-gray-500">Current Stock: {product.quantity}</p>
          <p className="text-sm text-gray-500">Selling Price: ₹{product.price.toFixed(2)}</p>
        </div>
      </div>

      {/* Only show radio buttons if stock reduction is allowed */}
      {canReduceStock && (
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="add"
              checked={formData.type === 'add'}
              onChange={handleChange}
              className="mr-2"
            />
            Add Stock
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="type"
              value="reduce"
              checked={formData.type === 'reduce'}
              onChange={handleChange}
              className="mr-2"
            />
            Reduce Stock
          </label>
        </div>
      )}

      {/* Show simple message for simple mode */}
      {!canReduceStock && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            <strong>Add Stock:</strong> Increase inventory when receiving new products.
          </p>
        </div>
      )}
      
      <Input
        label={
          canReduceStock 
            ? (formData.type === 'add' ? 'Quantity to Add' : 'Quantity to Reduce')
            : 'Quantity to Add'
        }
        type="number"
        name="quantity"
        value={formData.quantity}
        onChange={handleChange}
        min="1"
        max={formData.type === 'reduce' ? product.quantity : undefined}
        required
      />
      
      {(formData.type === 'add' || !canReduceStock) && (
        <Input
          label="Invoice Number (Optional)"
          name="invoiceNumber"
          value={formData.invoiceNumber}
          onChange={handleChange}
          placeholder="Enter invoice number"
        />
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes {formData.type === 'reduce' && canReduceStock && '(Required)'}
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder={
            formData.type === 'reduce' && canReduceStock
              ? "Reason for stock reduction (e.g., spoilage, damage, etc.)"
              : "Add any additional notes about this stock update"
          }
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={3}
          required={formData.type === 'reduce' && canReduceStock}
        />
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant={formData.type === 'reduce' && canReduceStock ? 'danger' : 'primary'}
          isLoading={loading}
        >
          {canReduceStock 
            ? (formData.type === 'add' ? 'Add' : 'Reduce') 
            : 'Add'
          } Stock
        </Button>
      </div>
    </form>
  );
};

export default StockUpdateForm;