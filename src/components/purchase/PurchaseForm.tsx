import React, { useState } from 'react';
import { Product, PurchaseFormData } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface PurchaseFormProps {
  products: Product[];
  onSubmit: (data: PurchaseFormData) => Promise<void>;
  onCancel?: () => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  products,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<PurchaseFormData>({
    productId: '',
    quantity: 0,
    costPrice: 0,
    invoiceNumber: '',
    notes: ''
  });
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.productId) {
      setError('Please select a product');
      return;
    }
    
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    
    if (formData.costPrice <= 0) {
      setError('Cost price must be greater than 0');
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'costPrice' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError('')}
        />
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product
        </label>
        <select
          name="productId"
          value={formData.productId}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          required
        >
          <option value="">Select a product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
      
      <Input
        label="Quantity"
        type="number"
        name="quantity"
        value={formData.quantity}
        onChange={handleChange}
        placeholder="0"
        min="1"
        required
      />
      
      <Input
        label="Cost Price"
        type="number"
        name="costPrice"
        value={formData.costPrice}
        onChange={handleChange}
        placeholder="0.00"
        min="0"
        step="0.01"
        required
      />
      
      <Input
        label="Invoice Number (Optional)"
        type="text"
        name="invoiceNumber"
        value={formData.invoiceNumber}
        onChange={handleChange}
        placeholder="Enter invoice number"
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes"
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
          Add Purchase
        </Button>
      </div>
    </form>
  );
};

export default PurchaseForm;