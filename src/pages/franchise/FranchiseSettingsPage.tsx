import React, { useState } from 'react';
import { Settings, Save, Store, Users, MapPin, Phone, Mail } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useFranchises } from '../../contexts/FranchiseContext';

const FranchiseSettingsPage: React.FC = () => {
  const { currentFranchise, updateFranchise } = useFranchises();
  
  const [settings, setSettings] = useState({
    franchiseName: currentFranchise?.name || 'ForkFlow - Mumbai',
    ownerName: currentFranchise?.ownerName || 'Rajesh Sharma',
    email: currentFranchise?.email || 'rajesh@mumbai.millethomefoods.com',
    phone: currentFranchise?.phone || '+91 98765 43210',
    address: currentFranchise?.address || 'Shop No. 15, Andheri West, Mumbai, Maharashtra 400058',
    gstNumber: currentFranchise?.gstNumber || 'GSTIN27ABCDE1234F1Z5',
    businessHours: {
      openTime: '09:00',
      closeTime: '21:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    },
    preferences: {
      currency: 'INR',
      taxRate: '5',
      receiptFooter: currentFranchise?.branding?.receiptFooter || 'Thank you for choosing ForkFlow!',
      enableNotifications: true,
      autoBackup: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        workingDays: prev.businessHours.workingDays.includes(day)
          ? prev.businessHours.workingDays.filter(d => d !== day)
          : [...prev.businessHours.workingDays, day]
      }
    }));
  };

  const handleSave = async () => {
    if (!currentFranchise) {
      setError('No franchise selected');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update franchise data
      await updateFranchise(currentFranchise.id, {
        name: settings.franchiseName,
        ownerName: settings.ownerName,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        gstNumber: settings.gstNumber,
        branding: {
          ...currentFranchise.branding,
          receiptFooter: settings.preferences.receiptFooter
        }
      });
      
      setSuccess('Franchise settings saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Safe access to franchise properties
  const subscriptionPlan = currentFranchise?.subscriptionPlan || currentFranchise?.plan || 'N/A';
  const subscriptionStatus = currentFranchise?.subscriptionStatus || 'N/A';
  const monthlyFee = currentFranchise?.monthlyFee || 0;
  const commissionRate = currentFranchise?.commissionRate || 0;
  const settings_data = currentFranchise?.settings || {};
  const features = settings_data.features || currentFranchise?.features || {};

  return (
    <DashboardLayout title="Franchise Settings">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} onClose={() => setError('')} />}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Store className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Franchise Name"
              value={settings.franchiseName}
              onChange={(e) => handleInputChange('franchiseName', e.target.value)}
              placeholder="Enter franchise name"
            />
            
            <Input
              label="Owner Name"
              value={settings.ownerName}
              onChange={(e) => handleInputChange('ownerName', e.target.value)}
              placeholder="Enter owner name"
            />
            
            <Input
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              icon={<Mail size={18} className="text-gray-500" />}
            />
            
            <Input
              label="Phone"
              value={settings.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
              icon={<Phone size={18} className="text-gray-500" />}
            />
            
            <Input
              label="GST Number"
              value={settings.gstNumber}
              onChange={(e) => handleInputChange('gstNumber', e.target.value)}
              placeholder="Enter GST number"
            />
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin size={16} className="inline mr-1" />
              Address
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter complete address"
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-purple-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Business Hours</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Opening Time"
              type="time"
              value={settings.businessHours.openTime}
              onChange={(e) => handleInputChange('businessHours.openTime', e.target.value)}
            />
            
            <Input
              label="Closing Time"
              type="time"
              value={settings.businessHours.closeTime}
              onChange={(e) => handleInputChange('businessHours.closeTime', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Working Days
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {daysOfWeek.map(day => (
                <label key={day.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.businessHours.workingDays.includes(day.key)}
                    onChange={() => handleWorkingDayToggle(day.key)}
                    className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">{day.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Preferences</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={settings.preferences.currency}
                onChange={(e) => handleInputChange('preferences.currency', e.target.value)}
                className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            
            <Input
              label="Tax Rate (%)"
              type="number"
              value={settings.preferences.taxRate}
              onChange={(e) => handleInputChange('preferences.taxRate', e.target.value)}
              placeholder="5"
              min="0"
              max="100"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Footer Message
            </label>
            <textarea
              value={settings.preferences.receiptFooter}
              onChange={(e) => handleInputChange('preferences.receiptFooter', e.target.value)}
              placeholder="Enter message to appear on receipts"
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-500">Receive system notifications and alerts</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('preferences.enableNotifications', !settings.preferences.enableNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  settings.preferences.enableNotifications ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.preferences.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Auto Backup</h3>
                <p className="text-sm text-gray-500">Automatically backup data daily</p>
              </div>
              <button
                type="button"
                onClick={() => handleInputChange('preferences.autoBackup', !settings.preferences.autoBackup)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  settings.preferences.autoBackup ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.preferences.autoBackup ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Information */}
        {currentFranchise && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-6 w-6 text-amber-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Subscription Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Current Plan</h3>
                <div className="space-y-1">
                  <p className="text-sm flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium capitalize">{subscriptionPlan}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{subscriptionStatus}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Monthly Fee:</span>
                    <span className="font-medium">₹{monthlyFee}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Commission Rate:</span>
                    <span className="font-medium">{commissionRate}%</span>
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Feature Limits</h3>
                <div className="space-y-1">
                  <p className="text-sm flex justify-between">
                    <span>Max Users:</span>
                    <span className="font-medium">{settings_data.maxUsers || 'Unlimited'}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Max Products:</span>
                    <span className="font-medium">{settings_data.maxProducts || 'Unlimited'}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Max Locations:</span>
                    <span className="font-medium">{settings_data.maxLocations || 'Unlimited'}</span>
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Enabled Features</h3>
                <div className="space-y-1">
                  <p className="text-sm flex justify-between">
                    <span>Returns:</span>
                    <span className="font-medium">{features.returns ? '✅' : '❌'}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Inventory:</span>
                    <span className="font-medium">{features.inventory ? '✅' : '❌'}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Reports:</span>
                    <span className="font-medium">{features.reports ? '✅' : '❌'}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    <span>Multi-Location:</span>
                    <span className="font-medium">{features.multiLocation ? '✅' : '❌'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={loading}
            className="inline-flex items-center"
          >
            <Save size={18} className="mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FranchiseSettingsPage;