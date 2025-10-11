import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import Button from '../ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Product, CartItem } from '@/types/pos';
import { useVirtualScroll, useDebounce, useRenderPerformance } from '@/hooks/usePerformanceOptimization';

interface OptimizedProductListProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  cartItems: CartItem[];
}

const ITEM_HEIGHT = 120;
const CONTAINER_HEIGHT = 400;

// Separate component for product item to avoid hooks in callback
const ProductItem = ({ 
  product, 
  index, 
  cartQuantity, 
  onAddToCart 
}: { 
  product: Product; 
  index: number; 
  cartQuantity: number;
  onAddToCart: (product: Product, quantity: number) => void;
}) => {
  const [quantity, setQuantity] = useState(1);
  
  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
  };
  
  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));
  
  return (
    <div
      style={{
        position: 'absolute',
        top: index * ITEM_HEIGHT,
        left: 0,
        right: 0,
        height: ITEM_HEIGHT
      }}
    >
      <Card className={`h-full mx-2 ${product.stock === 0 ? 'opacity-60 bg-gray-50' : ''}`}>
        <CardContent className="p-4 h-full flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`font-medium ${product.stock === 0 ? 'text-gray-500' : ''}`}>
                {product.name}
              </h3>
              {product.category && (
                <Badge variant="secondary" className="text-xs">
                  {product.category}
                </Badge>
              )}
              {product.stock === 0 && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${product.stock === 0 ? 'text-gray-500' : 'text-primary'}`}>
                ₹{product.price.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {cartQuantity > 0 && product.stock > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="min-w-[80px]"
              variant={product.stock === 0 ? "secondary" : "default"}
            >
              {product.stock === 0 ? 'Unavailable' : (cartQuantity > 0 ? `+${quantity}` : 'Add')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function OptimizedProductList({ 
  products, 
  onAddToCart, 
  cartItems 
}: OptimizedProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  useRenderPerformance('OptimizedProductList');
  
  // Debounced search
  const debouncedSearch = useDebounce((term: string) => {
    setSearchTerm(term);
  }, 300);
  
  // Get cart item quantity
  const getCartQuantity = useCallback((productId: string) => {
    const cartItem = cartItems.find(item => item.product.id === productId);
    return cartItem?.quantity || 0;
  }, [cartItems]);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);
  
  // Get categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...cats];
  }, [products]);
  
  // Virtual scrolling
  const {
    visibleItems,
    handleScroll
  } = useVirtualScroll(filteredProducts, ITEM_HEIGHT, CONTAINER_HEIGHT);
  
  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All' : category}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Product List - Virtual Scrolling */}
      <div className="border rounded-lg">
        <div
          style={{ height: CONTAINER_HEIGHT, overflow: 'auto' }}
          onScroll={handleScroll}
          className="relative"
        >
          <div style={{ height: filteredProducts.length * ITEM_HEIGHT, position: 'relative' }}>
            {visibleItems.map((product, index) => (
              <ProductItem
                key={product.id}
                product={product}
                index={index}
                cartQuantity={getCartQuantity(product.id)}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {visibleItems.length} / {filteredProducts.length} products
      </div>
    </div>
  );
};

export default OptimizedProductList;