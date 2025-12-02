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
import { couponService, Coupon, DishCoupon } from '../../services/couponService';
import { useAuth } from '../../contexts/AuthContext';

interface EnhancedCouponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon: (coupon: Coupon | DishCoupon, discountAmount: number, isDishCoupon: boolean) => void;
  orderSubtotal: number;
  orderItems: any[];
  existingCoupon?: {
    couponId: string;
    name: string;
    type: 'fixed' | 'percentage';
    discountAmount: number;
    isDishCoupon?: boolean;
  };
}

const EnhancedCouponSelectionModal: React.FC<EnhancedCouponSelectionModalProps> = ({
  isOpen,
  onClose,
  onApplyCoupon,
  orderSubtotal,
  orderItems,
  existingCoupon
}) => {
  const { currentUser } = useAuth();
  const [regularCoupons, setRegularCoupons] = useState<Coupon[]>([]);
  const [dishCoupons, setDishCoupons] = useState<DishCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | DishCoupon | null>(null);
  const [selectedIsDishCoupon, setSelectedIsDishCoupon] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'regular' | 'dish'>('regular');

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
      } catch (error) {
        console.error('❌ Error loading coupons:', error);
        setError('Failed to load coupons: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, [isOpen, currentUser?.locationId, currentUser?.locationIds]);

  const handleApplyCoupon = () => {
    if (!selectedCoupon) {
      setError('Please select a coupon');
      return;
    }

    let discountAmount = 0;
    
    if (selectedIsDishCoupon) {
      const dishCoupon = selectedCoupon as DishCoupon;
      discountAmount = couponService.calculateDishCouponDiscount(dishCoupon, orderItems);
      
      if (discountAmount === 0) {
        setError('No dish available for this discount');
        return;
      }
    } else {
      const regularCoupon = selectedCoupon as Coupon;
      discountAmount = couponService.calculateCouponDiscount(regularCoupon, orderSubtotal);
      
      if (discountAmount === 0) {
        setError('This coupon cannot be applied to the current order');
        return;
      }
    }

    onApplyCoupon(selectedCoupon, discountAmount, selectedIsDishCoupon);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCoupon(null);
    setSelectedIsDishCoupon(false);
    setError('');
    setSearchTerm('');
    onClose();
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon({} as Coupon, 0, false);
    handleClose();
  };

  const handleCouponSelect = (coupon: Coupon | DishCoupon, isDishCoupon: boolean) => {
    setSelectedCoupon(coupon);
    setSelectedIsDishCoupon(isDishCoupon);
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
    return couponService.calculateDishCouponDiscount(coupon, orderItems);
  };

  const isRegularCouponApplicable = (coupon: Coupon) => {
    if (orderSubtotal <= 0) return false;
    if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) return false;
    return calculateRegularDiscountForDisplay(coupon) > 0;
  };

  const isDishCouponApplicable = (coupon: DishCoupon) => {
    const { applicable } = couponService.isDishCouponApplicable(coupon, orderItems);
    return applicable;
  };

  // Filter coupons based on search
  const filteredRegularCoupons = regularCoupons.filter(coupon => 
    coupon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDishCoupons = dishCoupons.filter(coupon => 
    coupon.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.couponCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Select Coupon</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Order subtotal: <span className="font-semibold">₹{orderSubtotal.toFixed(2)}</span>
              {orderItems.length > 0 && (
                <span className="ml-2">
                  • Items: <span className="font-semibold">{orderItems.length}</span>
                </span>
              )}
            </p>
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
              Dish-Specific ({filteredDishCoupons.length})
            </button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {existingCoupon && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Current Coupon
                  </p>
                  <p className="text-sm text-orange-600">
                    {existingCoupon.name} - ₹{existingCoupon.discountAmount.toFixed(2)}
                    {existingCoupon.isDishCoupon && (
                      <span className="ml-1 text-xs bg-orange-200 px-2 py-0.5 rounded">Dish</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
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
                      const discountAmount = calculateRegularDiscountForDisplay(coupon);
                      
                      return (
                        <div
                          key={coupon.id}
                          onClick={() => isApplicable && handleCouponSelect(coupon, false)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedCoupon?.id === coupon.id && !selectedIsDishCoupon
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
                              {selectedCoupon?.id === coupon.id && !selectedIsDishCoupon ? (
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
                  {filteredDishCoupons.length === 0 ? (
                    <div className="text-center py-8">
                      <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No dish coupons available</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'No coupons match your search.' : 'Create dish-specific coupons in settings.'}
                      </p>
                    </div>
                  ) : (
                    filteredDishCoupons.map((coupon) => {
                      const isApplicable = isDishCouponApplicable(coupon);
                      const discountAmount = calculateDishDiscountForDisplay(coupon);
                      const { matchingItems } = couponService.isDishCouponApplicable(coupon, orderItems);
                      
                      return (
                        <div
                          key={coupon.id}
                          onClick={() => isApplicable && handleCouponSelect(coupon, true)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedCoupon?.id === coupon.id && selectedIsDishCoupon
                              ? 'border-orange-500 bg-orange-50'
                              : isApplicable
                              ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <ChefHat className="w-4 h-4 text-orange-500" />
                                <span className="font-medium text-gray-900">{coupon.couponCode}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Dish
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-2">
                                {formatDishCouponDisplay(coupon)}
                              </div>

                              <div className="text-xs text-gray-500 mb-1">
                                Dish: {coupon.dishName}
                              </div>

                              {isApplicable && matchingItems.length > 0 && (
                                <div className="text-xs text-green-600 mb-1">
                                  ✓ {matchingItems.length} matching item{matchingItems.length !== 1 ? 's' : ''} in order
                                </div>
                              )}

                              {!isApplicable && (
                                <div className="text-xs text-red-600 mt-2">
                                  No dish available for discount
                                </div>
                              )}
                            </div>

                            <div className="flex items-center ml-4">
                              {selectedCoupon?.id === coupon.id && selectedIsDishCoupon ? (
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
            onClick={handleApplyCoupon}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            disabled={!selectedCoupon || loading}
          >
            Apply Coupon
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCouponSelectionModal;