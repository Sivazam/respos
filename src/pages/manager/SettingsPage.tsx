import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { 
  Store, 
  Users, 
  CreditCard, 
  Save,
  RefreshCw,
  AlertCircle,
  Utensils,
  Table,
  Clock
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Input from '../../components/ui/Input';
import { SetupService } from '../../services/setupService';

const ManagerSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { locations } = useLocations();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [settings, setSettings] = useState({
    orderTypes: {
      dineIn: true,
      takeaway: true
    },
    paymentMethods: {
      cash: true,
      card: true,
      upi: false
    },
    tax: {
      cgst: 5,
      sgst: 5
    },
    maxEmployees: 10,
    tables: {
      totalTables: 20,
      indoorTables: 15,
      outdoorTables: 5
    },
    operations: {
      prepTime: 15,
      autoAcceptOrders: false,
      enableKot: true
    },
    menu: {
      categories: ['appetizers', 'maincourse', 'desserts', 'beverages'],
      enableSpiceLevels: true,
      enableCustomization: true
    }
  });

  // For Manager users, show only their assigned location
  const availableLocations = useMemo(() => {
    if (!currentUser || currentUser.role !== 'manager') return [];
    
    // Manager should only see their assigned location
    const assignedLocation = locations.find(loc => loc.id === currentUser.locationId);
    return assignedLocation ? [assignedLocation] : [];
  }, [currentUser?.role, currentUser?.locationId, locations]);

  // Set default selected location
  useEffect(() => {
    if (availableLocations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(availableLocations[0].id);
    }
  }, [availableLocations, selectedLocationId]);

  const selectedLocation = availableLocations.find(loc => loc.id === selectedLocationId);

  const loadLocationSettings = useCallback(async () => {
    if (!selectedLocation) return;

    setLoading(true);
    try {
      console.log('🔍 Loading settings for location:', selectedLocation.id);
      
      // Try to load existing settings from the database
      const result = await SetupService.getLocationSettings(selectedLocation.id);
      
      console.log('📋 Load result:', result);
      
      if (result.success && result.settings) {
        // Load existing settings
        const existingSettings = result.settings;
        console.log('✅ Found existing settings:', existingSettings);
        
        const newSettings = {
          orderTypes: existingSettings.orderTypes || { dineIn: true, takeaway: true },
          paymentMethods: existingSettings.paymentMethods || { cash: true, card: true, upi: false },
          tax: existingSettings.tax || { cgst: 5, sgst: 5 },
          maxEmployees: existingSettings.maxEmployees || 10,
          tables: existingSettings.tables || {
            totalTables: 20,
            indoorTables: 15,
            outdoorTables: 5
          },
          operations: existingSettings.operations || {
            prepTime: 15,
            autoAcceptOrders: false,
            enableKot: true
          },
          menu: existingSettings.menu || {
            categories: ['appetizers', 'maincourse', 'desserts', 'beverages'],
            enableSpiceLevels: true,
            enableCustomization: true
          }
        };
        
        console.log('📝 Settings to be applied:', newSettings);
        setSettings(newSettings);
        console.log('✅ Settings updated in state');
      } else {
        // Use default settings if none exist
        console.log('⚠️ No existing settings found, using defaults');
        const defaultSettings = {
          orderTypes: {
            dineIn: true,
            takeaway: true
          },
          paymentMethods: {
            cash: true,
            card: true,
            upi: false
          },
          tax: {
            cgst: 5,
            sgst: 5
          },
          maxEmployees: 10,
          tables: {
            totalTables: 20,
            indoorTables: 15,
            outdoorTables: 5
          },
          operations: {
            prepTime: 15,
            autoAcceptOrders: false,
            enableKot: true
          },
          menu: {
            categories: ['appetizers', 'maincourse', 'desserts', 'beverages'],
            enableSpiceLevels: true,
            enableCustomization: true
          }
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation) {
      loadLocationSettings();
    }
  }, [selectedLocation, loadLocationSettings]);

  const handleSave = async () => {
    if (!selectedLocation) return;

    setSaving(true);
    try {
      console.log('💾 Saving settings for location:', selectedLocation.id);
      console.log('📝 Current settings state:', settings);
      
      // Sanitize settings to remove any undefined values
      const sanitizedSettings = {
        orderTypes: {
          dineIn: settings.orderTypes?.dineIn ?? true,
          takeaway: settings.orderTypes?.takeaway ?? true
        },
        paymentMethods: {
          cash: settings.paymentMethods?.cash ?? true,
          card: settings.paymentMethods?.card ?? true,
          upi: settings.paymentMethods?.upi ?? false
        },
        tax: {
          cgst: settings.tax?.cgst ?? 5,
          sgst: settings.tax?.sgst ?? 5
        },
        maxEmployees: settings.maxEmployees ?? 10,
        tables: {
          totalTables: settings.tables?.totalTables ?? 20,
          indoorTables: settings.tables?.indoorTables ?? 15,
          outdoorTables: settings.tables?.outdoorTables ?? 5
        },
        operations: {
          prepTime: settings.operations?.prepTime ?? 15,
          autoAcceptOrders: settings.operations?.autoAcceptOrders ?? false,
          enableKot: settings.operations?.enableKot ?? true
        },
        menu: {
          categories: settings.menu?.categories ?? ['appetizers', 'maincourse', 'desserts', 'beverages'],
          enableSpiceLevels: settings.menu?.enableSpiceLevels ?? true,
          enableCustomization: settings.menu?.enableCustomization ?? true
        },
        enabledRoles: {
          admin: true,
          manager: true,
          employee: true
        },
        enabledFeatures: {
          inventory: true,
          reports: true,
          analytics: true,
          onlineOrders: false,
          reservations: false
        }
      };

      console.log('📦 Sanitized data to be saved:', sanitizedSettings);

      const result = await SetupService.updateLocationSettings(selectedLocation.id, sanitizedSettings);

      console.log('💾 Save result:', result);

      if (result.success) {
        console.log('✅ Settings saved successfully!');
        alert('Settings saved successfully');
        // Update local state with sanitized settings
        setSettings(prev => ({
          ...prev,
          ...sanitizedSettings
        }));
        // Add a small delay before reloading to ensure the save is complete
        setTimeout(async () => {
          console.log('🔄 Reloading settings to verify...');
          await loadLocationSettings();
          console.log('✅ Settings reloaded and verified');
        }, 500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (section: string, key: string, value: unknown) => {
    if (section === 'maxEmployees') {
      // Handle maxEmployees as a root-level field
      setSettings(prev => ({
        ...prev,
        maxEmployees: value as number
      }));
    } else {
      // Handle nested fields with proper type safety
      setSettings(prev => {
        const currentSection = prev[section as keyof typeof prev];
        // Ensure the current section exists and is an object
        if (currentSection && typeof currentSection === 'object') {
          return {
            ...prev,
            [section]: {
              ...currentSection,
              [key]: value
            }
          };
        } else {
          // Fallback if section is undefined or not an object
          return {
            ...prev,
            [section]: {
              [key]: value
            }
          };
        }
      });
    }
  };

  if (!selectedLocation && availableLocations.length === 0) {
    return (
      <DashboardLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No location assigned</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Location Settings</h2>
            <p className="text-gray-600">Configure your restaurant location settings</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadLocationSettings}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Location Info */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Store Name</label>
                <p className="text-lg font-semibold">{selectedLocation?.storeName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Location Name</label>
                <p className="text-lg font-semibold">{selectedLocation?.name}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Address</label>
                <p className="text-gray-900">{selectedLocation?.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{selectedLocation?.phone || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedLocation?.email || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Maximum Employees</label>
                <Input
                  type="number"
                  min="1"
                  value={settings.maxEmployees}
                  onChange={(e) => updateSettings('maxEmployees', 'value', parseInt(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="w-5 h-5" />
              Table Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Total Tables</label>
                <Input
                  type="number"
                  min="1"
                  value={settings.tables.totalTables}
                  onChange={(e) => updateSettings('tables', 'totalTables', parseInt(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Indoor Tables</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.tables.indoorTables}
                  onChange={(e) => updateSettings('tables', 'indoorTables', parseInt(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Outdoor Tables</label>
                <Input
                  type="number"
                  min="0"
                  value={settings.tables.outdoorTables}
                  onChange={(e) => updateSettings('tables', 'outdoorTables', parseInt(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Types */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Order Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Dine In</div>
                <div className="text-sm text-gray-600">Allow customers to dine at the restaurant</div>
              </div>
              <Button
                variant={settings.orderTypes.dineIn ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('orderTypes', 'dineIn', !settings.orderTypes.dineIn)}
              >
                {settings.orderTypes.dineIn ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Takeaway</div>
                <div className="text-sm text-gray-600">Allow customers to order for pickup</div>
              </div>
              <Button
                variant={settings.orderTypes.takeaway ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('orderTypes', 'takeaway', !settings.orderTypes.takeaway)}
              >
                {settings.orderTypes.takeaway ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operations Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Default Preparation Time (minutes)</label>
              <Input
                type="number"
                min="5"
                max="60"
                value={settings.operations.prepTime}
                onChange={(e) => updateSettings('operations', 'prepTime', parseInt(e.target.value))}
                className="mt-1 bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto Accept Orders</div>
                <div className="text-sm text-gray-600">Automatically accept incoming orders</div>
              </div>
              <Button
                variant={settings.operations.autoAcceptOrders ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('operations', 'autoAcceptOrders', !settings.operations.autoAcceptOrders)}
              >
                {settings.operations.autoAcceptOrders ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable KOT</div>
                <div className="text-sm text-gray-600">Kitchen Order Ticket system</div>
              </div>
              <Button
                variant={settings.operations.enableKot ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('operations', 'enableKot', !settings.operations.enableKot)}
              >
                {settings.operations.enableKot ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Cash</div>
                <div className="text-sm text-gray-600">Accept cash payments</div>
              </div>
              <Button
                variant={settings.paymentMethods.cash ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('paymentMethods', 'cash', !settings.paymentMethods.cash)}
              >
                {settings.paymentMethods.cash ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Card</div>
                <div className="text-sm text-gray-600">Accept card payments</div>
              </div>
              <Button
                variant={settings.paymentMethods.card ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('paymentMethods', 'card', !settings.paymentMethods.card)}
              >
                {settings.paymentMethods.card ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">UPI</div>
                <div className="text-sm text-gray-600">Accept UPI payments</div>
              </div>
              <Button
                variant={settings.paymentMethods.upi ? "default" : "outline"}
                size="sm"
                onClick={() => updateSettings('paymentMethods', 'upi', !settings.paymentMethods.upi)}
              >
                {settings.paymentMethods.upi ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Tax Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">CGST (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tax.cgst}
                  onChange={(e) => updateSettings('tax', 'cgst', parseFloat(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">SGST (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tax.sgst}
                  onChange={(e) => updateSettings('tax', 'sgst', parseFloat(e.target.value))}
                  className="mt-1 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManagerSettingsPage;