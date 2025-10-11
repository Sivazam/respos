import React, { useState } from 'react';
import { Franchise, FranchisePlan, FranchiseStoredFeatures } from '../../types';
import { franchisePlanDefaults } from '../../config/features';
import { useFranchises } from '../../contexts/FranchiseContext';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';
import { Check, X, Settings, DollarSign } from 'lucide-react';

interface FranchiseFeatureManagementProps {
  franchise: Franchise;
  onClose: () => void;
}

const FranchiseFeatureManagement: React.FC<FranchiseFeatureManagementProps> = ({
  franchise,
  onClose
}) => {
  const { updateFranchise } = useFranchises();

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

  const validPlan = getValidPlan(franchise.plan || franchise.subscriptionPlan);
  
  // Get features from either settings.features or legacy features property
  const franchiseFeatures = franchise.settings?.features || franchise.features;
  const validFeatures = getValidFeatures(franchiseFeatures, validPlan);
  
  // Get a valid commission rate with fallbacks
  const getValidCommissionRate = (): number => {
    if (typeof franchise.commissionRate === 'number') {
      return franchise.commissionRate;
    }
    
    const planConfig = franchisePlanDefaults[validPlan];
    return planConfig.defaultCommission;
  };
  
  const validCommissionRate = getValidCommissionRate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [features, setFeatures] = useState<FranchiseStoredFeatures>(validFeatures);
  const [plan, setPlan] = useState(validPlan);
  const [commissionRate, setCommissionRate] = useState(validCommissionRate);

  const handlePlanChange = (newPlan: FranchisePlan) => {
    const planConfig = franchisePlanDefaults[newPlan];
    setPlan(newPlan);
    setFeatures({
      returns: planConfig.returns,
      inventory: planConfig.inventory,
      reports: planConfig.reports,
      multiLocation: planConfig.multiLocation,
      apiAccess: planConfig.apiAccess
    });
    setCommissionRate(planConfig.defaultCommission);
  };

  const handleFeatureToggle = (feature: keyof FranchiseStoredFeatures) => {
    const planConfig = franchisePlanDefaults[plan];
    
    // Check if the feature is allowed for the current plan
    if (!planConfig[feature] && !features[feature]) {
      setError(`${feature} is not available in the ${plan} plan. Please upgrade to access this feature.`);
      return;
    }
    
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleSave = async () => {
    setError('');
    
    const planConfig = franchisePlanDefaults[plan];
    
    // Validate commission rate
    if (commissionRate < 0 || commissionRate > planConfig.maxCommission) {
      setError(`Commission rate must be between 0% and ${planConfig.maxCommission}% for the ${plan} plan.`);
      return;
    }

    try {
      setLoading(true);
      
      // Prepare update data
      const updateData: any = {
        plan,
        commissionRate
      };
      
      // Update features in the appropriate location based on franchise structure
      if (franchise.settings?.features) {
        updateData.settings = {
          ...franchise.settings,
          features
        };
      } else {
        updateData.features = features;
      }
      
      await updateFranchise(franchise.id, updateData);
      onClose();
    } catch (err: any) {
      console.error('Error updating franchise:', err);
      setError(err.message || 'Failed to update franchise');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureStatus = (feature: keyof FranchiseStoredFeatures) => {
    const planConfig = franchisePlanDefaults[plan];
    const isAvailableInPlan = planConfig[feature];
    const isEnabled = features[feature];
    
    if (!isAvailableInPlan) {
      return { status: 'unavailable', color: 'text-gray-400', icon: X };
    }
    
    return { 
      status: isEnabled ? 'enabled' : 'disabled', 
      color: isEnabled ? 'text-green-600' : 'text-red-600',
      icon: isEnabled ? Check : X
    };
  };

  const featureDescriptions = {
    returns: 'Allow processing of sales and purchase returns',
    inventory: 'Full inventory management with stock tracking',
    reports: 'Advanced reporting and analytics features',
    multiLocation: 'Support for multiple store locations',
    apiAccess: 'API access for third-party integrations'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Management</h2>
          <p className="text-gray-600">Configure features and settings for {franchise.name}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {/* Plan Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Settings className="mr-2" />
          Subscription Plan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(franchisePlanDefaults).map(([planKey, planConfig]) => (
            <div
              key={planKey}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                plan === planKey
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePlanChange(planKey as FranchisePlan)}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium capitalize">{planKey}</h4>
                {plan === planKey && (
                  <Check className="text-green-600" size={20} />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Default Commission: {planConfig.defaultCommission}%
              </p>
              <p className="text-sm text-gray-600">
                Max Commission: {planConfig.maxCommission}%
              </p>
            </div>
          ))}
        </div>

        {/* Commission Rate */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <DollarSign className="mr-1" size={16} />
            Commission Rate (%)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
              min="0"
              max={franchisePlanDefaults[plan].maxCommission}
              step="0.1"
              className="w-32 rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">
              (Max: {franchisePlanDefaults[plan].maxCommission}% for {plan} plan)
            </span>
          </div>
        </div>
      </div>

      {/* Feature Configuration */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Configuration</h3>
        
        <div className="space-y-4">
          {Object.entries(features).map(([feature, enabled]) => {
            const featureKey = feature as keyof FranchiseStoredFeatures;
            const featureStatus = getFeatureStatus(featureKey);
            const Icon = featureStatus.icon;
            const planConfig = franchisePlanDefaults[plan];
            const isAvailableInPlan = planConfig[featureKey as keyof typeof planConfig];
            
            return (
              <div
                key={feature}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isAvailableInPlan ? 'border-gray-200' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <Icon className={`mr-3 ${featureStatus.color}`} size={20} />
                    <div>
                      <h4 className={`font-medium ${isAvailableInPlan ? 'text-gray-900' : 'text-gray-500'}`}>
                        {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')}
                      </h4>
                      <p className={`text-sm ${isAvailableInPlan ? 'text-gray-600' : 'text-gray-400'}`}>
                        {featureDescriptions[featureKey as keyof typeof featureDescriptions]}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isAvailableInPlan && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Upgrade Required
                    </span>
                  )}
                  <button
                    onClick={() => handleFeatureToggle(featureKey)}
                    disabled={!isAvailableInPlan}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled && isAvailableInPlan
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    } ${!isAvailableInPlan ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled && isAvailableInPlan ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Plan Details</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Plan: <span className="font-medium capitalize">{plan}</span></li>
              <li>Commission Rate: <span className="font-medium">{commissionRate}%</span></li>
              <li>Active Features: <span className="font-medium">
                {Object.values(features).filter(Boolean).length} of {Object.keys(features).length}
              </span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Enabled Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {Object.entries(features)
                .filter(([_, enabled]) => enabled)
                .map(([feature, _]) => (
                  <li key={feature} className="flex items-center">
                    <Check className="text-green-600 mr-1" size={14} />
                    {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={loading}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default FranchiseFeatureManagement;