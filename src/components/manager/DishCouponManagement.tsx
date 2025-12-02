import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Percent,
  Save,
  X,
  ChefHat,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { couponService, DishCoupon, generateCouponCode } from '../../services/couponService';
import { useAuth } from '../../contexts/AuthContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import toast from 'react-hot-toast';

interface DishCouponFormData {
  dishName: string;
  selectedPercentages: number[];
}

const DishCouponManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { menuItems } = useMenuItems();
  const [dishCoupons, setDishCoupons] = useState<DishCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Array<{name: string; price: number; imageUrl: string}>>([]);

  const [formData, setFormData] = useState<DishCouponFormData>({
    dishName: '',
    selectedPercentages: []
  });

  const availablePercentages = [8, 9, 10, 11, 12, 13, 14, 15];

  // Get unique dish names from menu items for autocomplete
  const dishSuggestions = Array.from(new Set(
    menuItems
      .filter(item => item.name && item.name.trim())
      .map(item => ({
        name: item.name.trim(),
        price: item.price || 0,
        imageUrl: item.imageUrl || ''
      }))
  )).sort((a, b) => a.name.localeCompare(b.name));

  // Load dish coupons for current location
  useEffect(() => {
    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
    
    if (!locationId) {
      console.log('🔍 DishCouponManagement: No locationId available');
      return;
    }

    const loadDishCoupons = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading dish coupons for location:', locationId);
        const locationDishCoupons = await couponService.getLocationDishCoupons(locationId);
        console.log('✅ Dish coupons loaded successfully:', locationDishCoupons.length, 'coupons');
        setDishCoupons(locationDishCoupons);
      } catch (error) {
        console.error('❌ Error loading dish coupons:', error);
        toast.error('Failed to load dish coupons: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadDishCoupons();
  }, [currentUser?.locationId, currentUser?.locationIds]);

  const resetForm = () => {
    setFormData({
      dishName: '',
      selectedPercentages: []
    });
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    setError('');
  };

  const handleAddDishCoupon = () => {
    resetForm();
    setShowForm(true);
  };

  const handlePercentageToggle = (percentage: number) => {
    setFormData(prev => ({
      ...prev,
      selectedPercentages: prev.selectedPercentages.includes(percentage)
        ? prev.selectedPercentages.filter(p => p !== percentage)
        : [...prev.selectedPercentages, percentage]
    }));
  };

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedPercentages: prev.selectedPercentages.length === availablePercentages.length 
        ? [] 
        : [...availablePercentages]
    }));
  };

  // Autocomplete handlers
  const handleDishNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, dishName: value }));
    
    if (value.trim()) {
      const filtered = dishSuggestions.filter(dish => 
        dish.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  const handleDishNameFocus = () => {
    if (formData.dishName.trim()) {
      const filtered = dishSuggestions.filter(dish => 
        dish.name.toLowerCase().includes(formData.dishName.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleSuggestionSelect = (selectedDish: {name: string; price: number; imageUrl: string}) => {
    setFormData(prev => ({ ...prev, dishName: selectedDish.name }));
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const handleSuggestionBlur = () => {
    // Hide suggestions after a short delay to allow click events
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.dishName.trim()) {
      setError('Dish name is required');
      return;
    }

    if (formData.selectedPercentages.length === 0) {
      setError('Please select at least one discount percentage');
      return;
    }

    if (!currentUser?.uid) {
      setError('User information is required');
      return;
    }

    const locationId = currentUser?.locationId || 
                      (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);

    if (!locationId) {
      setError('Location information is required');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔍 Creating dish coupons with data:', {
        dishName: formData.dishName,
        percentages: formData.selectedPercentages,
        locationId: locationId
      });

      const couponIds = await couponService.createDishCoupons(
        formData.dishName.trim(),
        formData.selectedPercentages,
        locationId,
        currentUser.uid
      );

      toast.success(`${couponIds.length} dish coupons created successfully!`);

      // Reload dish coupons
      const updatedDishCoupons = await couponService.getLocationDishCoupons(locationId);
      setDishCoupons(updatedDishCoupons);

      setShowForm(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Error creating dish coupons:', error);
      setError(error.message || 'Failed to create dish coupons');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDishCoupon = async (dishCoupon: DishCoupon) => {
    if (!window.confirm(`Are you sure you want to delete dish coupon "${dishCoupon.couponCode}"?`)) {
      return;
    }

    try {
      await couponService.deleteDishCoupon(dishCoupon.id!);
      toast.success('Dish coupon deleted successfully!');
      
      const locationId = currentUser?.locationId || 
                        (currentUser?.locationIds && currentUser.locationIds.length > 0 ? currentUser.locationIds[0] : null);
      
      if (locationId) {
        const updatedDishCoupons = await couponService.getLocationDishCoupons(locationId);
        setDishCoupons(updatedDishCoupons);
      }
    } catch (error: any) {
      console.error('Error deleting dish coupon:', error);
      toast.error(error.message || 'Failed to delete dish coupon');
    }
  };

  // Filter dish coupons based on search
  const filteredDishCoupons = dishCoupons.filter(coupon => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return coupon.dishName.toLowerCase().includes(searchLower) ||
           coupon.couponCode.toLowerCase().includes(searchLower);
  });

  // Group coupons by dish name for better display
  const groupedCoupons = filteredDishCoupons.reduce((groups, coupon) => {
    const dishName = coupon.dishName;
    if (!groups[dishName]) {
      groups[dishName] = [];
    }
    groups[dishName].push(coupon);
    return groups;
  }, {} as Record<string, DishCoupon[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Dish-Specific Coupons</h2>
          <p className="text-gray-600 mt-1">Create and manage discount coupons for specific dishes</p>
        </div>
        <Button
          onClick={handleAddDishCoupon}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus size={20} className="mr-2" />
          Add Dish Coupons
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <Input
          type="text"
          placeholder="Search by dish name or coupon code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Dish Coupons List */}
      <div className="bg-white rounded-lg shadow">
        {Object.keys(groupedCoupons).length === 0 ? (
          <div className="text-center py-12">
            <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No dish coupons</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No coupons match your search.' : 'Get started by creating dish-specific coupons.'}
            </p>
            <div className="mt-6">
              <Button onClick={handleAddDishCoupon} variant="outline">
                <Plus size={16} className="mr-2" />
                Add Dish Coupons
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedCoupons).map(([dishName, coupons]) => (
              <div key={dishName} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{dishName}</h3>
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-600">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-gray-900 text-sm">{coupon.couponCode}</span>
                          </div>
                          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <Percent size={12} />
                            {coupon.discountPercentage}% OFF
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDishCoupon(coupon)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dish Coupon Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-orange-500" />
                Create Dish-Specific Coupons
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dish Name
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={formData.dishName}
                      onChange={(e) => handleDishNameChange(e.target.value)}
                      onFocus={handleDishNameFocus}
                      onBlur={handleSuggestionBlur}
                      placeholder="e.g., Chilli Chicken, Mutton Biryani"
                      className="w-full"
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                            onClick={() => handleSuggestionSelect(suggestion)}
                          >
                            {suggestion.imageUrl && (
                              <img 
                                src={suggestion.imageUrl || '/placeholder-dish.png'}
                                alt={suggestion.name}
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                  // Fallback for broken images
                                  if (e.currentTarget.src.startsWith('data:')) {
                                    e.currentTarget.src = '/placeholder-dish.png';
                                  }
                                }}
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{suggestion.name}</div>
                              <div className="text-xs text-gray-500">From menu items</div>
                              <div className="text-sm font-semibold text-green-600">₹{suggestion.price.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Type to search menu items, or select from suggestions
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Discount Percentages
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-orange-600 hover:text-orange-800"
                    >
                      {formData.selectedPercentages.length === availablePercentages.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {availablePercentages.map((percentage) => (
                      <button
                        key={percentage}
                        type="button"
                        onClick={() => handlePercentageToggle(percentage)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.selectedPercentages.includes(percentage)
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg font-bold">{percentage}%</div>
                        <div className="text-xs text-gray-500">
                          {generateCouponCode(formData.dishName || 'DISH', percentage)}
                        </div>
                      </button>
                    ))}
                  </div>
                  {formData.selectedPercentages.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {formData.selectedPercentages.length} coupon{formData.selectedPercentages.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-xs text-green-600 mt-1">
                        {formData.selectedPercentages.map(p => generateCouponCode(formData.dishName || 'DISH', p)).join(', ')}
                      </div>
                    </div>
                  )}
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={isSubmitting || formData.selectedPercentages.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create {formData.selectedPercentages.length} Coupon{formData.selectedPercentages.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DishCouponManagement;