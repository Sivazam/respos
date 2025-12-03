import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  X, 
  Percent,
  IndianRupee,
  Check,
  ChefHat,
  Search
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { couponService, Coupon, DishCoupon, OrderCoupons, AppliedDishCoupon } from '../../services/couponService';
import { useAuth } from '../../contexts/AuthContext';

interface EnhancedCouponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupons: (orderCoupons: OrderCoupons, totalDiscount: number) => void;
  orderSubtotal: number;
  orderItems: {
    name: string;
    price: number;
    quantity: number;
    modifications?: string[];
    portionSize?: 'half' | 'full';
  }[];
  existingCoupons?: OrderCoupons;
}

const EnhancedCouponSelectionModal: React.FC<EnhancedCouponSelectionModalProps> = ({
  isOpen,
  onClose,
  onApplyCoupons,
  orderSubtotal,
  orderItems,
  existingCoupons
}) => {
  const { currentUser } = useAuth();
  const [regularCoupons, setRegularCoupons] = useState<Coupon[]>([]);
  const [dishCoupons, setDishCoupons] = useState<DishCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'regular' | 'dish'>('regular');
  
  // State for multiple coupon selection
  const [selectedRegularCoupon, setSelectedRegularCoupon] = useState<Coupon | null>(null);
  const [selectedDishCoupons, setSelectedDishCoupons] = useState<DishCoupon[]>([]);

  useEffect(() => {
    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
    
    if (!isOpen || !locationId) {
      return;
    }

    const loadCoupons = async () => {
      try {
        setLoading(true);
        
        // Load both regular and dish coupons
        const [locationCoupons, locationDishCoupons] = await Promise.all([
          couponService.getLocationCoupons(locationId),
          couponService.getLocationDishCoupons(locationId)
        ]);
        
        setRegularCoupons(locationCoupons);
        setDishCoupons(locationDishCoupons);

        // Initialize selections from existing coupons
        if (existingCoupons) {
          // Set regular coupon if exists
          if (existingCoupons.regularCoupon) {
            const regular = locationCoupons.find(c => c.id === existingCoupons.regularCoupon?.couponId);
            if (regular) setSelectedRegularCoupon(regular);
          }

          // Set dish coupons if exist
          if (existingCoupons.dishCoupons && existingCoupons.dishCoupons.length > 0) {
            const selectedDishes = existingCoupons.dishCoupons
              .map(applied => locationDishCoupons.find(c => c.id === applied.couponId))
              .filter(Boolean) as DishCoupon[];
            setSelectedDishCoupons(selectedDishes);
          }
        }
      } catch (error) {
        console.error('❌ Error loading coupons:', error);
        setError('Failed to load coupons: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, [isOpen, currentUser?.locationId, currentUser?.locationIds, existingCoupons]);

  const handleApplyCoupons = () => {
    try {
      // Validate coupon combination
      const validation = couponService.validateCouponCombination(
        selectedRegularCoupon,
        selectedDishCoupons,
        orderSubtotal,
        orderItems
      );

      if (!validation.isValid) {
        setError(validation.error || 'Invalid coupon combination');
        return;
      }

      // Create order coupons object
      const orderCoupons: OrderCoupons = {
        dishCoupons: selectedDishCoupons
          .map(dishCoupon => couponService.createAppliedDishCoupon(dishCoupon, orderItems))
          .filter(Boolean) as AppliedDishCoupon[]
      };

      // Only add regularCoupon if it exists
      if (selectedRegularCoupon) {
        const appliedRegularCoupon = couponService.createAppliedRegularCoupon(selectedRegularCoupon, orderSubtotal);
        if (appliedRegularCoupon) {
          orderCoupons.regularCoupon = appliedRegularCoupon;
        }
      }

      // Calculate total discount
      const { totalDiscount } = couponService.calculateTotalDiscount(orderCoupons, orderSubtotal, orderItems);

      onApplyCoupons(orderCoupons, totalDiscount);
      handleClose();
    } catch (error) {
      console.error('Error applying coupons:', error);
      setError('Failed to apply coupons');
    }
  };

  const handleClose = () => {
    setSelectedRegularCoupon(null);
    setSelectedDishCoupons([]);
    setError('');
    setSearchTerm('');
    onClose();
  };

  const handleRemoveAllCoupons = () => {
    onApplyCoupons({ dishCoupons: [] }, 0);
    handleClose();
  };

  const handleRegularCouponSelect = (coupon: Coupon) => {
    if (selectedRegularCoupon?.id === coupon.id) {
      setSelectedRegularCoupon(null);
    } else {
      setSelectedRegularCoupon(coupon);
    }
    setError('');
  };

  const handleDishCouponToggle = (coupon: DishCoupon) => {
    const isSelected = selectedDishCoupons.some(selected => selected.id === coupon.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedDishCoupons(prev => prev.filter(selected => selected.id !== coupon.id));
    } else {
      // Add to selection (only if no other coupon for same dish is selected)
      const hasSameDish = selectedDishCoupons.some(selected => 
        selected.dishName.toLowerCase() === coupon.dishName.toLowerCase()
      );
      
      if (hasSameDish) {
        setError(`Only one coupon per dish is allowed. ${coupon.dishName} already has a coupon selected.`);
        return;
      }
      
      setSelectedDishCoupons(prev => [...prev, coupon]);
    }
    setError('');
  };

  const formatRegularCouponDisplay = (coupon: Coupon) => {
    if (coupon.type === 'fixed') {
      return `₹${coupon.value} OFF`;
    } else {
      return `${coupon.value}% OFF${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ''}`;
    }
  };

  const formatDishCouponDisplay = (coupon: DishCoupon) => {
    return `${coupon.discountPercentage}% OFF on ${coupon.dishName}`;
  };

  const calculateRegularDiscountForDisplay = (coupon: Coupon) => {
    return couponService.calculateCouponDiscount(coupon, orderSubtotal);
  };

  const calculateDishDiscountForDisplay = (coupon: DishCoupon) => {
    const discount = couponService.calculateDishCouponDiscount(coupon, orderItems);
    return discount;
  };

  const isRegularCouponApplicable = (coupon: Coupon) => {
    if (orderSubtotal <= 0) return false;
    if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) return false;
    return calculateRegularDiscountForDisplay(coupon) > 0;
  };

  const canSelectDishCoupon = (coupon: DishCoupon) => {
    return !selectedDishCoupons.some(selected => 
      selected.dishName.toLowerCase() === coupon.dishName.toLowerCase()
    );
  };

  // Filter coupons based on search
  const filteredRegularCoupons = regularCoupons.filter(coupon => 
    coupon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get only applicable dish coupons (filtered by order items and already selected coupons)
  const applicableDishCoupons = couponService.getApplicableDishCoupons(dishCoupons, orderItems, selectedDishCoupons);

  // Calculate current total discount
  const currentOrderCoupons: OrderCoupons = {
    dishCoupons: selectedDishCoupons
      .map(dishCoupon => couponService.createAppliedDishCoupon(dishCoupon, orderItems))
      .filter(Boolean) as AppliedDishCoupon[]
  };

  // Only add regularCoupon if it exists
  if (selectedRegularCoupon) {
    const appliedRegularCoupon = couponService.createAppliedRegularCoupon(selectedRegularCoupon, orderSubtotal);
    if (appliedRegularCoupon) {
      currentOrderCoupons.regularCoupon = appliedRegularCoupon;
    }
  }

  const { totalDiscount } = couponService.calculateTotalDiscount(currentOrderCoupons, orderSubtotal, orderItems);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Select Coupons</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 flex-shrink-0">
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Order subtotal: <span className="font-semibold">₹{orderSubtotal.toFixed(2)}</span>
                {orderItems.length > 0 && (
                  <span className="ml-2">
                    • Items: <span className="font-semibold">{orderItems.length}</span>
                  </span>
                )}
              </p>
              {totalDiscount > 0 && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  Total savings: ₹{totalDiscount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('regular')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'regular'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-2" />
                Regular Coupons ({filteredRegularCoupons.length})
              </button>
              <button
                onClick={() => setActiveTab('dish')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dish'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ChefHat className="w-4 h-4 inline mr-2" />
                Dish-Specific ({applicableDishCoupons.length})
              </button>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Coupons Summary */}
            {(selectedRegularCoupon || selectedDishCoupons.length > 0) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Selected Coupons ({(selectedRegularCoupon ? 1 : 0) + selectedDishCoupons.length})
                    </p>
                    <div className="text-xs text-green-600 mt-1">
                      {selectedRegularCoupon && (
                        <div>• {selectedRegularCoupon.name} - ₹{calculateRegularDiscountForDisplay(selectedRegularCoupon).toFixed(2)}</div>
                      )}
                      {selectedDishCoupons.map(coupon => (
                        <div key={coupon.id}>• {coupon.dishName} - ₹{calculateDishDiscountForDisplay(coupon).toFixed(2)}</div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAllCoupons}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove All
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-3 pb-4">
                {activeTab === 'regular' && (
                  <>
                    {filteredRegularCoupons.length === 0 ? (
                      <div className="text-center py-8">
                        <Tag className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No regular coupons available</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm ? 'No coupons match your search.' : 'Contact your manager to add coupons.'}
                        </p>
                      </div>
                    ) : (
                      filteredRegularCoupons.map((coupon) => {
                        const isApplicable = isRegularCouponApplicable(coupon);
                        const isSelected = selectedRegularCoupon?.id === coupon.id;
                        const discountAmount = calculateRegularDiscountForDisplay(coupon);
                        
                        return (
                          <div
                            key={coupon.id}
                            onClick={() => isApplicable && handleRegularCouponSelect(coupon)}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : isApplicable
                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-gray-900">{coupon.name}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    coupon.type === 'fixed' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {coupon.type === 'fixed' ? (
                                      <><IndianRupee size={10} className="mr-1" /> Fixed</>
                                    ) : (
                                      <><Percent size={10} className="mr-1" /> Percentage</>
                                    )}
                                  </span>
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  {formatRegularCouponDisplay(coupon)}
                                </div>

                                {coupon.minOrderAmount && (
                                  <div className="text-xs text-gray-500 mb-1">
                                    Min order: ₹{coupon.minOrderAmount}
                                  </div>
                                )}

                                {coupon.description && (
                                  <div className="text-xs text-gray-500">
                                    {coupon.description}
                                  </div>
                                )}

                                {!isApplicable && (
                                  <div className="text-xs text-red-600 mt-2">
                                    {coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount
                                      ? `Minimum order of ₹${coupon.minOrderAmount} required`
                                      : 'Not applicable to this order'}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center ml-4">
                                {isSelected ? (
                                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                    <Check size={12} className="text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-5 h-5 border-2 rounded-full ${
                                    isApplicable ? 'border-gray-300' : 'border-gray-200'
                                  }`}></div>
                                )}
                              </div>
                            </div>

                            {isApplicable && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">You save:</span>
                                  <span className="font-semibold text-green-600">
                                    ₹{discountAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {activeTab === 'dish' && (
                  <>
                    {applicableDishCoupons.length === 0 ? (
                      <div className="text-center py-8">
                        <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No applicable dish coupons</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm ? 'No coupons match your search.' : 'No dish coupons are applicable to the current order items.'}
                        </p>
                      </div>
                    ) : (
                      applicableDishCoupons.map((coupon) => {
                        const isSelected = selectedDishCoupons.some(selected => selected.id === coupon.id);
                        const canSelect = canSelectDishCoupon(coupon);
                        const discountAmount = calculateDishDiscountForDisplay(coupon);
                        
                        return (
                          <div
                            key={coupon.id}
                            onClick={() => (canSelect || isSelected) && handleDishCouponToggle(coupon)}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50'
                                : canSelect
                                ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-gray-900">{coupon.dishName}</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    <ChefHat size={10} className="mr-1" /> Dish
                                  </span>
                                  <span className="text-xs text-gray-500">({coupon.couponCode})</span>
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  {formatDishCouponDisplay(coupon)}
                                </div>



                                {!canSelect && !isSelected && (
                                  <div className="text-xs text-orange-600 mt-2">
                                    Another coupon for this dish is already selected
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center ml-4">
                                {isSelected ? (
                                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                    <Check size={12} className="text-white" />
                                  </div>
                                ) : (
                                  <div className={`w-5 h-5 border-2 rounded-full ${
                                    canSelect ? 'border-gray-300' : 'border-gray-200'
                                  }`}></div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">You save:</span>
                                <span className="font-semibold text-green-600">
                                  ₹{discountAmount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApplyCoupons}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={loading || (!selectedRegularCoupon && selectedDishCoupons.length === 0)}
          >
            Apply {totalDiscount > 0 && `₹${totalDiscount.toFixed(2)} in Discounts`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCouponSelectionModal;