import React, { useState } from 'react';
import { ReturnFormData, ReturnItem, Sale, Purchase } from '../../types';
import { useReturns } from '../../contexts/ReturnContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface ReturnFormProps {
  type: 'sale' | 'purchase';
  reference: Sale | Purchase;
  onSubmit: (data: ReturnFormData) => Promise<void>;
  onCancel?: () => void;
}

const ReturnForm: React.FC<ReturnFormProps> = ({
  type,
  reference,
  onSubmit,
  onCancel
}) => {
  const { isItemReturned } = useReturns();
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<Sale['paymentMethod']>('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Please provide a reason for the return');
      return;
    }

    try {
      setLoading(true);
      const items = ('items' in reference) ? reference.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })) : [];

      // For sales returns, calculate the total including GST
      let returnTotal = 0;
      if (type === 'sale' && 'total' in reference) {
        // Use the full sale total (including GST) for returns
        returnTotal = reference.total;
        console.log('Return total calculation:', {
          saleTotal: reference.total,
          subtotal: reference.subtotal,
          cgst: reference.cgst,
          sgst: reference.sgst,
          returnTotal
        });
      } else {
        // For purchase returns, calculate based on items
        returnTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }

      await onSubmit({
        type,
        referenceId: reference.id,
        items,
        reason: reason.trim(),
        refundMethod: type === 'sale' ? refundMethod : undefined,
        total: returnTotal // Pass the calculated total
      });
    } catch (err: any) {
      setError(err.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  // Calculate display totals
  const itemsSubtotal = ('items' in reference) 
    ? reference.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    : 0;
  
  const displayTotal = type === 'sale' && 'total' in reference ? reference.total : itemsSubtotal;
  const gstAmount = type === 'sale' && 'cgst' in reference && 'sgst' in reference 
    ? reference.cgst + reference.sgst 
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError('')}
        />
      )}

      {/* Sale/Purchase Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">
          {type === 'sale' ? 'Sale' : 'Purchase'} Summary
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Reference ID:</span>
            <span className="font-mono">{reference.id.slice(0, 8)}</span>
          </div>
          {type === 'sale' && 'invoiceNumber' in reference && (
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-mono">{reference.invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{itemsSubtotal.toFixed(2)}</span>
          </div>
          {gstAmount > 0 && (
            <>
              <div className="flex justify-between">
                <span>CGST (2.5%):</span>
                <span>₹{('cgst' in reference ? reference.cgst : 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (2.5%):</span>
                <span>₹{('sgst' in reference ? reference.sgst : 0).toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-medium border-t pt-1">
            <span>Total Amount:</span>
            <span>₹{displayTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Items Display */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Items to Return</h3>
        <div className="border rounded-lg divide-y">
          {'items' in reference ? (
            reference.items.map(item => {
              const isReturned = isItemReturned(reference.id, item.id);
              return (
                <div 
                  key={item.id} 
                  className={`p-4 flex items-center ${isReturned ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isReturned ? 'text-gray-400' : 'text-gray-900'}`}>
                      {item.name}
                      {isReturned && ' (Already Returned)'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.quantity}x @ ₹{item.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="text-sm text-gray-900">
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4">
              <p className="text-sm text-gray-500">No items available for return</p>
            </div>
          )}
        </div>
      </div>

      {/* Return Amount Display */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900">Total Refund Amount:</span>
          <span className="text-lg font-bold text-blue-600">₹{displayTotal.toFixed(2)}</span>
        </div>
        {gstAmount > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            (Includes ₹{gstAmount.toFixed(2)} GST)
          </p>
        )}
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Return Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          rows={3}
          placeholder="Please provide a reason for this return..."
          required
        />
      </div>

      {/* Refund Method (for sales returns only) */}
      {type === 'sale' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Refund Method
          </label>
          <select
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as Sale['paymentMethod'])}
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
          </select>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-2">
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
          Process Return (₹{displayTotal.toFixed(2)})
        </Button>
      </div>
    </form>
  );
};

export default ReturnForm;