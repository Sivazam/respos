import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { SetupService, LocationSettingsData } from '../../services/setupService';
import { useAuth } from '../../contexts/AuthContext';

interface LocationSettingsProps {
  locationId: string;
  onClose?: () => void;
}

const LocationSettings: React.FC<LocationSettingsProps> = ({ locationId, onClose }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LocationSettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocationSettings();
  }, [locationId]);

  const fetchLocationSettings = async () => {
    try {
      setLoading(true);
      const result = await SetupService.getLocationSettings(locationId);
      
      if (result.success && result.settings) {
        setSettings(result.settings as LocationSettingsData);
      } else {
        // Create default settings if none exist
        const defaultSettings: LocationSettingsData = {
          locationId,
          orderTypes: { dineIn: true, takeaway: true },
          paymentMethods: { cash: true, card: true, upi: false },
          tax: { cgst: 5, sgst: 5 },
          maxEmployees: 10,
          tables: { totalTables: 20, indoorTables: 15, outdoorTables: 5 },
          operations: { prepTime: 15, autoAcceptOrders: false, enableKot: true },
          menu: { categories: ['appetizers', 'maincourse', 'desserts', 'beverages'], enableSpiceLevels: true, enableCustomization: true },
          enabledRoles: { admin: true, manager: true, employee: true },
          enabledFeatures: { inventory: true, reports: true, analytics: true, onlineOrders: false, reservations: false }
        };
        setSettings(defaultSettings);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch location settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const result = await SetupService.updateLocationSettings(locationId, settings);
      
      if (result.success) {
        alert('Location settings updated successfully!');
        if (onClose) onClose();
      } else {
        setError(result.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset to default settings? This will overwrite all current settings.')) {
      await fetchLocationSettings();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Failed to load location settings</p>
        <Button onClick={fetchLocationSettings} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Location Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Types */}
        <Card>
          <CardHeader>
            <CardTitle>Order Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.orderTypes.dineIn}
                onChange={(e) => setSettings({
                  ...settings,
                  orderTypes: { ...settings.orderTypes, dineIn: e.target.checked }
                })}
              />
              <span>Dine-in</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.orderTypes.takeaway}
                onChange={(e) => setSettings({
                  ...settings,
                  orderTypes: { ...settings.orderTypes, takeaway: e.target.checked }
                })}
              />
              <span>Takeaway</span>
            </label>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.paymentMethods.cash}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentMethods: { ...settings.paymentMethods, cash: e.target.checked }
                })}
              />
              <span>Cash</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.paymentMethods.card}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentMethods: { ...settings.paymentMethods, card: e.target.checked }
                })}
              />
              <span>Card</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.paymentMethods.upi}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentMethods: { ...settings.paymentMethods, upi: e.target.checked }
                })}
              />
              <span>UPI</span>
            </label>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">CGST (%)</label>
              <Input
                type="number"
                value={settings.tax.cgst}
                onChange={(e) => setSettings({
                  ...settings,
                  tax: { ...settings.tax, cgst: Number(e.target.value) }
                })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SGST (%)</label>
              <Input
                type="number"
                value={settings.tax.sgst}
                onChange={(e) => setSettings({
                  ...settings,
                  tax: { ...settings.tax, sgst: Number(e.target.value) }
                })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Staff Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Maximum Employees</label>
              <Input
                type="number"
                value={settings.maxEmployees}
                onChange={(e) => setSettings({
                  ...settings,
                  maxEmployees: Number(e.target.value)
                })}
                min="1"
                max="100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preparation Time (minutes)</label>
              <Input
                type="number"
                value={settings.operations?.prepTime || 15}
                onChange={(e) => setSettings({
                  ...settings,
                  operations: { 
                    ...settings.operations, 
                    prepTime: Number(e.target.value) 
                  }
                })}
                min="1"
                max="120"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.operations?.autoAcceptOrders || false}
                onChange={(e) => setSettings({
                  ...settings,
                  operations: { 
                    ...settings.operations, 
                    autoAcceptOrders: e.target.checked 
                  }
                })}
              />
              <span>Auto Accept Orders</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.operations?.enableKot || false}
                onChange={(e) => setSettings({
                  ...settings,
                  operations: { 
                    ...settings.operations, 
                    enableKot: e.target.checked 
                  }
                })}
              />
              <span>Enable KOT</span>
            </label>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabledFeatures.inventory}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledFeatures: { ...settings.enabledFeatures, inventory: e.target.checked }
                })}
              />
              <span>Inventory Management</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabledFeatures.reports}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledFeatures: { ...settings.enabledFeatures, reports: e.target.checked }
                })}
              />
              <span>Reports</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabledFeatures.analytics}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledFeatures: { ...settings.enabledFeatures, analytics: e.target.checked }
                })}
              />
              <span>Analytics</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabledFeatures.onlineOrders}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledFeatures: { ...settings.enabledFeatures, onlineOrders: e.target.checked }
                })}
              />
              <span>Online Orders</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.enabledFeatures.reservations}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledFeatures: { ...settings.enabledFeatures, reservations: e.target.checked }
                })}
              />
              <span>Reservations</span>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LocationSettings;