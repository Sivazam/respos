import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  X, 
  Percent,
  IndianRupee,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { couponService, Coupon } from '../../services/couponService';
import { useAuth } from '../../contexts/AuthContext';

interface CouponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCoupon: (coupon: Coupon, discountAmount: number) => void;
  orderSubtotal: number;
  existingCoupon?: {
    couponId: string;
    name: string;
    type: 'fixed' | 'percentage';
    discountAmount: number;
  };
}

const CouponSelectionModal: React.FC<CouponSelectionModalProps> = ({
  isOpen,
  onClose,
  onApplyCoupon,
  orderSubtotal,
  existingCoupon
}) => {
  const { currentUser } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get locationId from currentUser or fallback to first available location
    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
    
    if (!isOpen || !locationId) {
      console.log('🔍 CouponSelectionModal: Not loading coupons', { 
        isOpen, 
        currentUser: !!currentUser, 
        locationId: currentUser?.locationId,
        locationIds: currentUser?.locationIds,
        userRole: currentUser?.role
      });
      return;
    }

    const loadCoupons = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading coupons for location:', locationId);
        const locationCoupons = await couponService.getLocationCoupons(locationId);
        console.log('✅ Coupons loaded successfully:', locationCoupons.length, 'coupons');
        setCoupons(locationCoupons);
      } catch (error) {
        console.error('❌ Error loading coupons:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: error.code,
          stack: error.stack
        });
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

    const discountAmount = couponService.calculateCouponDiscount(selectedCoupon, orderSubtotal);
    
    if (discountAmount === 0) {
      setError('This coupon cannot be applied to the current order');
      return;
    }

    onApplyCoupon(selectedCoupon, discountAmount);
    handleClose();
  };

  const handleClose = () => {
    setSelectedCoupon(null);
    setError('');
    onClose();
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon({} as Coupon, 0);
    handleClose();
  };

  const formatCouponDisplay = (coupon: Coupon) => {
    if (coupon.type === 'fixed') {
      return `₹${coupon.value} OFF`;
    } else {
      return `${coupon.value}% OFF${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ''}`;
    }
  };

  const calculateDiscountForDisplay = (coupon: Coupon) => {
    return couponService.calculateCouponDiscount(coupon, orderSubtotal);
  };

  const isCouponApplicable = (coupon: Coupon) => {
    if (orderSubtotal <= 0) return false;
    if (coupon.minOrderAmount && orderSubtotal < coupon.minOrderAmount) return false;
    return calculateDiscountForDisplay(coupon) > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
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
            </p>
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
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Contact your manager to add coupons for this location.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {coupons.map((coupon) => {
                const isApplicable = isCouponApplicable(coupon);
                const discountAmount = calculateDiscountForDisplay(coupon);
                
                return (
                  <div
                    key={coupon.id}
                    onClick={() => isApplicable && setSelectedCoupon(coupon)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedCoupon?.id === coupon.id
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
                          {formatCouponDisplay(coupon)}
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
                        {selectedCoupon?.id === coupon.id ? (
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
              })}
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

export default CouponSelectionModal;