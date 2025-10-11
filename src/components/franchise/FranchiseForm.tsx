import React, { useState } from 'react';
import { Franchise, FranchisePlan, FranchiseStoredFeatures } from '../../types';
import { franchisePlanDefaults } from '../../config/features';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface FranchiseFormProps {
  onSubmit: (data: any) => Promise<void>;
  initialData?: Franchise;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const FranchiseForm: React.FC<FranchiseFormProps> = ({
  onSubmit,
  initialData,
  onCancel,
  isSubmitting = false,
  submitButtonText = 'Save'
}) => {
  // Ensure plan is always valid, default to 'basic' if invalid
  const getValidPlan = (plan: string | undefined): FranchisePlan => {
    if (plan && (plan === 'basic' || plan === 'premium' || plan === 'enterprise')) {
      return plan as FranchisePlan;
    }
    return 'basic';
  };

  // Ensure features object has all required properties
  const getValidFeatures = (features: any, plan: FranchisePlan): FranchiseStoredFeatures => {
    const planConfig = franchisePlanDefaults[plan];
    return {
      returns: features?.returns ?? planConfig.returns,
      inventory: features?.inventory ?? planConfig.inventory,
      reports: features?.reports ?? planConfig.reports,
      multiLocation: features?.multiLocation ?? planConfig.multiLocation,
      apiAccess: features?.apiAccess ?? planConfig.apiAccess
    };
  };

  const validPlan = getValidPlan(initialData?.plan);
  const validFeatures = getValidFeatures(initialData?.features, validPlan);
  const validCommissionRate = initialData?.commissionRate ?? franchisePlanDefaults[validPlan].defaultCommission;

  const [formData, setFormData] = useState<any>({
    name: initialData?.name || '',
    ownerName: initialData?.ownerName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    plan: validPlan,
    commissionRate: validCommissionRate,
    features: validFeatures
  });
  
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.name.trim()) {
      setError('Franchise name is required');
      return;
    }
    
    if (!formData.ownerName.trim()) {
      setError('Owner name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    const planConfig = franchisePlanDefaults[formData.plan];
    if (formData.commissionRate < 0 || formData.commissionRate > planConfig.maxCommission) {
      setError(`Commission rate must be between 0% and ${planConfig.maxCommission}% for the ${formData.plan} plan.`);
      return;
    }
    
    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save franchise');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'plan') {
      const selectedPlan = value as FranchisePlan;
      const planConfig = franchisePlanDefaults[selectedPlan];
      setFormData(prev => ({
        ...prev,
        plan: selectedPlan,
        commissionRate: planConfig.defaultCommission,
        features: {
          returns: planConfig.returns,
          inventory: planConfig.inventory,
          reports: planConfig.reports,
          multiLocation: planConfig.multiLocation,
          apiAccess: planConfig.apiAccess
        }
      }));
    } else if (name === 'commissionRate') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFeatureChange = (feature: keyof FranchiseStoredFeatures) => {
    const planConfig = franchisePlanDefaults[formData.plan];
    
    // Check if the feature is allowed for the current plan
    if (!planConfig[feature] && !formData.features[feature]) {
      setError(`${feature} is not available in the ${formData.plan} plan. Please upgrade to access this feature.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError('')}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <Input
            label="Franchise Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter franchise name"
            required
          />
          
          <Input
            label="Owner Name"
            name="ownerName"
            value={formData.ownerName}
            onChange={handleChange}
            placeholder="Enter owner name"
            required
          />
          
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            required
          />
          
          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter complete address"
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Plan & Features</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan
            </label>
            <select
              name="plan"
              value={formData.plan}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="basic">Basic Plan</option>
              <option value="premium">Premium Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
          
          <Input
            label="Commission Rate (%)"
            type="number"
            name="commissionRate"
            value={formData.commissionRate}
            onChange={handleChange}
            min="0"
            max={franchisePlanDefaults[formData.plan].maxCommission}
            step="0.1"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Features
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.features.returns}
                  onChange={() => handleFeatureChange('returns')}
                  disabled={!franchisePlanDefaults[formData.plan].returns && !formData.features.returns}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`ml-2 text-sm ${franchisePlanDefaults[formData.plan].returns ? 'text-gray-700' : 'text-gray-400'}`}>
                  Returns Management
                  {!franchisePlanDefaults[formData.plan].returns && (
                    <span className="text-xs text-gray-500 ml-1">(Upgrade required)</span>
                  )}
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.features.inventory}
                  onChange={() => handleFeatureChange('inventory')}
                  disabled={!franchisePlanDefaults[formData.plan].inventory && !formData.features.inventory}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`ml-2 text-sm ${franchisePlanDefaults[formData.plan].inventory ? 'text-gray-700' : 'text-gray-400'}`}>
                  Inventory Management
                  {!franchisePlanDefaults[formData.plan].inventory && (
                    <span className="text-xs text-gray-500 ml-1">(Upgrade required)</span>
                  )}
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.features.reports}
                  onChange={() => handleFeatureChange('reports')}
                  disabled={!franchisePlanDefaults[formData.plan].reports && !formData.features.reports}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`ml-2 text-sm ${franchisePlanDefaults[formData.plan].reports ? 'text-gray-700' : 'text-gray-400'}`}>
                  Advanced Reports
                  {!franchisePlanDefaults[formData.plan].reports && (
                    <span className="text-xs text-gray-500 ml-1">(Upgrade required)</span>
                  )}
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.features.multiLocation}
                  onChange={() => handleFeatureChange('multiLocation')}
                  disabled={!franchisePlanDefaults[formData.plan].multiLocation && !formData.features.multiLocation}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`ml-2 text-sm ${franchisePlanDefaults[formData.plan].multiLocation ? 'text-gray-700' : 'text-gray-400'}`}>
                  Multi-Location Support
                  {!franchisePlanDefaults[formData.plan].multiLocation && (
                    <span className="text-xs text-gray-500 ml-1">(Upgrade required)</span>
                  )}
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.features.apiAccess}
                  onChange={() => handleFeatureChange('apiAccess')}
                  disabled={!franchisePlanDefaults[formData.plan].apiAccess && !formData.features.apiAccess}
                  className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className={`ml-2 text-sm ${franchisePlanDefaults[formData.plan].apiAccess ? 'text-gray-700' : 'text-gray-400'}`}>
                  API Access
                  {!franchisePlanDefaults[formData.plan].apiAccess && (
                    <span className="text-xs text-gray-500 ml-1">(Upgrade required)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Plan: <span className="font-medium">{formData.plan.charAt(0).toUpperCase() + formData.plan.slice(1)}</span></p>
              <p>Commission Rate: <span className="font-medium">{formData.commissionRate}%</span></p>
              <p>Max Commission: <span className="font-medium">{franchisePlanDefaults[formData.plan].maxCommission}%</span></p>
              <p>Active Features: <span className="font-medium">
                {Object.values(formData.features).filter(Boolean).length} of {Object.keys(formData.features).length}
              </span></p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4 border-t">
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
          isLoading={loading || isSubmitting}
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default FranchiseForm;