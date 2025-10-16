import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import Button from '../ui/Button';
import { CartItem } from '../../types';

interface CartProps {
  onCheckout: () => void;
  items?: CartItem[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  total?: number;
  onClearCart?: () => void;
  cgstRate?: number;
  sgstRate?: number;
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void;
}

const Cart: React.FC<CartProps> = ({ 
  onCheckout, 
  items: propItems, 
  subtotal: propSubtotal, 
  cgst: propCgst, 
  sgst: propSgst, 
  total: propTotal,
  onClearCart,
  cgstRate: propCgstRate,
  sgstRate: propSgstRate,
  onUpdateQuantity: propOnUpdateQuantity
}) => {
  const { 
    items: contextItems, 
    removeItem, 
    updateQuantity, 
    subtotal: contextSubtotal, 
    cgst: contextCgst, 
    sgst: contextSgst, 
    total: contextTotal, 
    cgstRate: contextCgstRate,
    sgstRate: contextSgstRate 
  } = useCart();

  // Use props if provided, otherwise use context values
  const items = propItems || contextItems;
  const subtotal = propSubtotal !== undefined ? propSubtotal : contextSubtotal;
  const cgst = propCgst !== undefined ? propCgst : contextCgst;
  const sgst = propSgst !== undefined ? propSgst : contextSgst;
  const total = propTotal !== undefined ? propTotal : contextTotal;
  const cgstRate = propCgstRate !== undefined ? propCgstRate : contextCgstRate;
  const sgstRate = propSgstRate !== undefined ? propSgstRate : contextSgstRate;

  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm sm:text-base">Cart is empty</p>
        <p className="text-xs sm:text-sm text-gray-400 mt-2">Add items to begin a new sale</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto max-h-32 sm:max-h-48 lg:max-h-none">
        {items.map(item => (
          <div key={item.id} className="flex items-center py-2 sm:py-3 lg:py-4 border-b">
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base truncate">
                {item.name}
                {item.portionSize && item.portionSize !== 'full' && (
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1 sm:px-2 py-0.5 rounded">
                    {item.portionSize === 'half' ? '(Half)' : '(Full)'}
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} each</p>
            </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => (propOnUpdateQuantity || updateQuantity)(item.id, item.quantity - 1)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                  <Minus size={12} className="sm:size-14" />
                </button>
                
                <span className="w-5 sm:w-6 lg:w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                
                <button
                  onClick={() => (propOnUpdateQuantity || updateQuantity)(item.id, item.quantity + 1)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                  <Plus size={12} className="sm:size-14" />
                </button>
                
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded-full hover:bg-gray-100 text-red-500 transition-colors duration-200"
                >
                  <Trash2 size={12} className="sm:size-14" />
                </button>
              </div>
            </div>
        ))}
      </div>
      
      <div className="border-t pt-2 sm:pt-3 lg:pt-4 space-y-1 sm:space-y-2 flex-shrink-0">
        <div className="flex justify-between text-xs sm:text-sm">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        
        {/* Only show GST if rates are greater than 0 */}
        {cgstRate > 0 && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span>CGST ({(cgstRate * 100).toFixed(1)}%)</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
        )}
        
        {sgstRate > 0 && (
          <div className="flex justify-between text-xs sm:text-sm">
            <span>SGST ({(sgstRate * 100).toFixed(1)}%)</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between font-semibold text-sm sm:text-base lg:text-lg pt-1 sm:pt-2 border-t">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        
        <div className="flex gap-2 mt-2 sm:mt-3 lg:mt-4">
          {onClearCart && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearCart}
              className="flex-1 transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-xs sm:text-sm">Clear</span>
            </Button>
          )}
          
          <Button
            variant="primary"
            fullWidth={!onClearCart}
            size="lg"
            onClick={onCheckout}
            className={`${onClearCart ? 'flex-1' : ''} transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <span className="text-xs sm:text-sm">₹{total.toFixed(2)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;