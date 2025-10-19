import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Percent,
  IndianRupee,
  Save,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { couponService, Coupon } from '../../services/couponService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface CouponFormData {
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  description?: string | null;
}

const CouponManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CouponFormData>({
    name: '',
    type: 'fixed',
    value: 0,
    maxDiscountAmount: null,
    minOrderAmount: null,
    description: null
  });

  // Load coupons for current location
  useEffect(() => {
    // Get locationId from currentUser or fallback to first available location
    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
    
    if (!locationId) {
      console.log('🔍 CouponManagement: No locationId available', { 
        currentUser: !!currentUser, 
        locationId: currentUser?.locationId,
        locationIds: currentUser?.locationIds,
        userRole: currentUser?.role,
        uid: currentUser?.uid
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
        toast.error('Failed to load coupons: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadCoupons();
  }, [currentUser?.locationId, currentUser?.locationIds]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'fixed',
      value: 0,
      maxDiscountAmount: null,
      minOrderAmount: null,
      description: null
    });
    setEditingCoupon(null);
    setError('');
  };

  const handleAddCoupon = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setFormData({
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minOrderAmount: coupon.minOrderAmount,
      description: coupon.description
    });
    setEditingCoupon(coupon);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Coupon name is required');
      return;
    }

    if (formData.value <= 0) {
      setError('Coupon value must be greater than 0');
      return;
    }

    if (formData.type === 'percentage' && (formData.value <= 0 || formData.value > 100)) {
      setError('Percentage must be between 1 and 100');
      return;
    }

    if (formData.type === 'percentage' && !formData.maxDiscountAmount) {
      setError('Maximum discount amount is required for percentage coupons');
      return;
    }

    if (formData.minOrderAmount && formData.minOrderAmount <= 0) {
      setError('Minimum order amount must be greater than 0');
      return;
    }

    if (!currentUser?.uid) {
      setError('User information is required');
      return;
    }

    // Get locationId from currentUser or fallback to first available location
    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);

    if (!locationId) {
      setError('Location information is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim().toUpperCase(),
        type: formData.type,
        value: formData.value,
        minOrderAmount: formData.minOrderAmount || null,
        description: formData.description?.trim() || null,
        isActive: true,
        locationId: locationId,
        createdBy: currentUser.uid
      };

      // Only include maxDiscountAmount if it's defined and not null
      if (formData.type === 'percentage' && formData.maxDiscountAmount) {
        couponData.maxDiscountAmount = formData.maxDiscountAmount;
      }

      console.log('🔍 Creating/updating coupon with data:', {
        ...couponData,
        currentUser: !!currentUser,
        locationId: locationId
      });

      if (editingCoupon) {
        console.log('🔍 Updating existing coupon:', editingCoupon.id);
        await couponService.updateCoupon(editingCoupon.id!, couponData);
        toast.success('Coupon updated successfully!');
      } else {
        console.log('🔍 Creating new coupon');
        await couponService.createCoupon(couponData);
        toast.success('Coupon created successfully!');
      }

      // Reload coupons
      console.log('🔍 Reloading coupons after save...');
      const updatedCoupons = await couponService.getLocationCoupons(locationId);
      console.log('✅ Coupons reloaded successfully:', updatedCoupons.length, 'coupons');
      setCoupons(updatedCoupons);

      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error saving coupon:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setError(error.message || 'Failed to save coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.name}"?`)) {
      return;
    }

    try {
      await couponService.deleteCoupon(coupon.id!);
      toast.success('Coupon deleted successfully!');
      
      // Reload coupons
      const locationId = currentUser?.locationId || 
                        (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
      
      if (locationId) {
        const updatedCoupons = await couponService.getLocationCoupons(locationId);
        setCoupons(updatedCoupons);
      }
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error(error.message || 'Failed to delete coupon');
    }
  };

  const formatCouponDisplay = (coupon: Coupon) => {
    if (coupon.type === 'fixed') {
      return `₹${coupon.value} OFF`;
    } else {
      return `${coupon.value}% OFF${coupon.maxDiscountAmount ? ` (Max ₹${coupon.maxDiscountAmount})` : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Check if user has location access
  const locationId = currentUser?.locationId || 
                    (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);

  if (!locationId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Tag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Location Access</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have access to any location. Please contact your administrator to get location access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coupon Management</h2>
          <p className="text-gray-600 mt-1">Create and manage discount coupons for your location</p>
        </div>
        <Button
          onClick={handleAddCoupon}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus size={20} className="mr-2" />
          Add Coupon
        </Button>
      </div>

      {/* Coupons List */}
      <div className="bg-white rounded-lg shadow">
        {coupons.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new coupon.</p>
            <div className="mt-6">
              <Button onClick={handleAddCoupon} variant="outline">
                <Plus size={16} className="mr-2" />
                Add Coupon
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coupon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Tag className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{coupon.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coupon.type === 'fixed' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {coupon.type === 'fixed' ? (
                          <><IndianRupee size={12} className="mr-1" /> Fixed</>
                        ) : (
                          <><Percent size={12} className="mr-1" /> Percentage</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCouponDisplay(coupon)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No minimum'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">
                        {coupon.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditCoupon(coupon)}
                        className="text-orange-600 hover:text-orange-900 mr-3"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Coupon Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">
                {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., DIWALI50, WELCOME10"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'fixed' })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.type === 'fixed'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IndianRupee size={16} className="mx-auto mb-1" />
                      <div className="text-sm font-medium">Fixed Amount</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'percentage' })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        formData.type === 'percentage'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Percent size={16} className="mx-auto mb-1" />
                      <div className="text-sm font-medium">Percentage</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type === 'fixed' ? 'Discount Amount (₹)' : 'Discount (%)'}
                  </label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.type === 'fixed' ? '50' : '10'}
                    min={formData.type === 'percentage' ? 1 : 0}
                    max={formData.type === 'percentage' ? 100 : undefined}
                    step={formData.type === 'percentage' ? 1 : 1}
                    className="w-full"
                  />
                </div>

                {formData.type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Discount Amount (₹)
                    </label>
                    <Input
                      type="number"
                      value={formData.maxDiscountAmount || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        maxDiscountAmount: parseFloat(e.target.value) || null 
                      })}
                      placeholder="100"
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Amount (₹) - Optional
                  </label>
                  <Input
                    type="number"
                    value={formData.minOrderAmount || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      minOrderAmount: parseFloat(e.target.value) || null 
                    })}
                    placeholder="200"
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description - Optional
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Special festival offer..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {editingCoupon ? 'Update' : 'Create'} Coupon
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponManagement;