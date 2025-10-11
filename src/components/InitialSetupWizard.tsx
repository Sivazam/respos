import React, { useState } from 'react';
import { 
  Users, 
  Table, 
  Settings, 
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Store,
  Package
} from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import Input from '../components/ui/Input';
import { Badge } from '../components/ui/badge';
import { SetupService } from '../services/setupService';

// Initial Setup Wizard Component

interface SetupData {
  tables: {
    id: string;
    name: string;
    capacity: number;
    shape: 'round' | 'square' | 'rectangle';
    quantity: number;
  }[];
  staff: {
    maxEmployees: number;
    enabledRoles: {
      admin: boolean;
      manager: boolean;
      employee: boolean;
    };
  };
  operations: {
    orderTypes: {
      dineIn: boolean;
      takeaway: boolean;
    };
    paymentMethods: {
      cash: boolean;
      card: boolean;
      upi: boolean;
    };
    tax: {
      cgst: number;
      sgst: number;
    };
  };
  features: {
    inventory: boolean;
    reports: boolean;
    analytics: boolean;
    onlineOrders: boolean;
    reservations: boolean;
  };
}

interface InitialSetupWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  locationId: string;
  userId: string;
}

const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({
  isOpen,
  onComplete,
  locationId,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setupData, setSetupData] = useState<SetupData>({
    tables: [],
    staff: {
      maxEmployees: 10,
      enabledRoles: {
        admin: true,
        manager: true,
        employee: true
      }
    },
    operations: {
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
        cgst: 0,
        sgst: 0
      }
    },
    features: {
      inventory: true,
      reports: true,
      analytics: true,
      onlineOrders: false,
      reservations: false
    }
  });

  const steps = [
    { id: 'welcome', title: 'Welcome', icon: Store },
    { id: 'tables', title: 'Table Configuration', icon: Table },
    { id: 'staff', title: 'Staff Management', icon: Users },
    { id: 'operations', title: 'Operations', icon: Settings },
    { id: 'features', title: 'Features', icon: Package },
    { id: 'complete', title: 'Complete', icon: CheckCircle }
  ];

  const addTable = () => {
    const newTable = {
      id: Date.now().toString(),
      name: `Table ${setupData.tables.length + 1}`,
      capacity: 4,
      shape: 'square' as const,
      quantity: 1
    };
    setSetupData(prev => ({
      ...prev,
      tables: [...prev.tables, newTable]
    }));
  };

  const updateTable = (id: string, updates: Partial<SetupData['tables'][0]>) => {
    setSetupData(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === id ? { ...table, ...updates } : table
      )
    }));
  };

  const removeTable = (id: string) => {
    setSetupData(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== id)
    }));
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create tables
      const tablesToCreate = [];
      for (const tableConfig of setupData.tables) {
        for (let i = 0; i < tableConfig.quantity; i++) {
          tablesToCreate.push({
            name: `${tableConfig.name} ${i + 1}`,
            capacity: tableConfig.capacity,
            shape: tableConfig.shape,
            status: 'available' as const,
            locationId
          });
        }
      }

      if (tablesToCreate.length > 0) {
        const tablesResult = await SetupService.createTablesBatch(tablesToCreate);
        if (!tablesResult.success) {
          throw new Error(tablesResult.error);
        }
      }

      // Update location settings (this will create if they don't exist)
      const settingsResult = await SetupService.updateLocationSettings(locationId, {
        ...setupData.operations,
        maxEmployees: setupData.staff.maxEmployees,
        enabledRoles: setupData.staff.enabledRoles,
        enabledFeatures: setupData.features
      });

      if (!settingsResult.success) {
        throw new Error(settingsResult.error);
      }

      // Mark setup as completed for the user
      const setupCompleteResult = await SetupService.markSetupComplete(userId);
      if (!setupCompleteResult.success) {
        console.warn('Failed to mark user setup as complete:', setupCompleteResult.error);
      }

      console.log('✅ Setup completed successfully for user:', userId, 'at location:', locationId);
      alert('Initial setup completed successfully!');
      onComplete();
    } catch (error) {
      console.error('Setup failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center">
              <Store className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Welcome to Restaurant Manager</h2>
              <p className="text-muted-foreground mb-6">
                Let's configure your new location with a few simple steps.
              </p>
              <div className="text-left space-y-3 max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Table className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm">Configure your dining tables</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm">Set up staff roles and limits</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Settings className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm">Configure operations and payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm">Choose your features</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 1: // Tables
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configure Your Tables</h3>
              <p className="text-muted-foreground text-sm">
                Add different types of tables for your restaurant
              </p>
            </div>

            <div className="space-y-4">
              {setupData.tables.map((table) => (
                <Card key={table.id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Table Name</label>
                        <Input
                          value={table.name}
                          onChange={(e) => updateTable(table.id, { name: e.target.value })}
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Capacity</label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={table.capacity}
                          onChange={(e) => updateTable(table.id, { capacity: parseInt(e.target.value) })}
                          className="mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Shape</label>
                        <select
                          value={table.shape}
                          onChange={(e) => updateTable(table.id, { shape: e.target.value as 'round' | 'square' | 'rectangle' })}
                          className="mt-1 w-full px-3 py-2 border rounded-md"
                        >
                          <option value="square">Square</option>
                          <option value="round">Round</option>
                          <option value="rectangle">Rectangle</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          min="1"
                          value={table.quantity}
                          onChange={(e) => updateTable(table.id, { quantity: parseInt(e.target.value) })}
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTable(table.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addTable}
                className="w-full"
              >
                Add Table Type
              </Button>
            </div>
          </div>
        );

      case 2: // Staff
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Staff Management</h3>
              <p className="text-muted-foreground text-sm">
                Configure your team structure and roles
              </p>
            </div>

            <Card className="bg-white">
              <CardContent className="p-4">
                <label className="text-sm font-medium">Maximum Employees</label>
                <Input
                  type="number"
                  min="1"
                  value={setupData.staff.maxEmployees}
                  onChange={(e) => setSetupData(prev => ({
                    ...prev,
                    staff: {
                      ...prev.staff,
                      maxEmployees: parseInt(e.target.value)
                    }
                  }))}
                  className="mt-1 bg-white"
                />
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Enabled Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(setupData.staff.enabledRoles).map(([role, enabled]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{role}</span>
                    <Button
                      variant={enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSetupData(prev => ({
                        ...prev,
                        staff: {
                          ...prev.staff,
                          enabledRoles: {
                            ...prev.staff.enabledRoles,
                            [role]: !enabled
                          }
                        }
                      }))}
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 3: // Operations
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Operations Settings</h3>
              <p className="text-muted-foreground text-sm">
                Configure your restaurant operations
              </p>
            </div>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Order Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Dine In</span>
                  <Button
                    variant={setupData.operations.orderTypes.dineIn ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSetupData(prev => ({
                      ...prev,
                      operations: {
                        ...prev.operations,
                        orderTypes: {
                          ...prev.operations.orderTypes,
                          dineIn: !prev.operations.orderTypes.dineIn
                        }
                      }
                    }))}
                  >
                    {setupData.operations.orderTypes.dineIn ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Takeaway</span>
                  <Button
                    variant={setupData.operations.orderTypes.takeaway ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSetupData(prev => ({
                      ...prev,
                      operations: {
                        ...prev.operations,
                        orderTypes: {
                          ...prev.operations.orderTypes,
                          takeaway: !prev.operations.orderTypes.takeaway
                        }
                      }
                    }))}
                  >
                    {setupData.operations.orderTypes.takeaway ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(setupData.operations.paymentMethods).map(([method, enabled]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="capitalize">{method}</span>
                    <Button
                      variant={enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSetupData(prev => ({
                        ...prev,
                        operations: {
                          ...prev.operations,
                          paymentMethods: {
                            ...prev.operations.paymentMethods,
                            [method]: !enabled
                          }
                        }
                      }))}
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-base">Tax Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CGST (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={setupData.operations.tax.cgst}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      operations: {
                        ...prev.operations,
                        tax: {
                          ...prev.operations.tax,
                          cgst: parseFloat(e.target.value)
                        }
                      }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SGST (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={setupData.operations.tax.sgst}
                    onChange={(e) => setSetupData(prev => ({
                      ...prev,
                      operations: {
                        ...prev.operations,
                        tax: {
                          ...prev.operations.tax,
                          sgst: parseFloat(e.target.value)
                        }
                      }
                    }))}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4: // Features
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Features</h3>
              <p className="text-muted-foreground text-sm">
                Select the features you want to enable
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(setupData.features).map(([feature, enabled]) => (
                <Card key={feature} className={`bg-white ${enabled ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">{feature}</div>
                        <div className="text-sm text-muted-foreground">
                          {feature === 'inventory' && 'Manage stock and products'}
                          {feature === 'reports' && 'Generate business reports'}
                          {feature === 'analytics' && 'View business analytics'}
                          {feature === 'onlineOrders' && 'Accept online orders'}
                          {feature === 'reservations' && 'Manage table reservations'}
                        </div>
                      </div>
                      <Button
                        variant={enabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSetupData(prev => ({
                          ...prev,
                          features: {
                            ...prev.features,
                            [feature]: !enabled
                          }
                        }))}
                      >
                        {enabled ? 'Enabled' : 'Enable'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5: // Complete
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Setup Complete!</h2>
              <p className="text-muted-foreground mb-6">
                Your restaurant has been configured successfully. Here's a summary:
              </p>
            </div>

            <div className="text-left space-y-4 max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <Table className="w-5 h-5 text-blue-600" />
                <span className="text-sm">
                  {setupData.tables.reduce((acc, table) => acc + table.quantity, 0)} tables configured
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-sm">
                  {setupData.staff.maxEmployees} max employees
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span className="text-sm">
                  {Object.values(setupData.operations.paymentMethods).filter(Boolean).length} payment methods
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-orange-600" />
                <span className="text-sm">
                  {Object.values(setupData.features).filter(Boolean).length} features enabled
                </span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Completing Setup...' : 'Start Using Restaurant Manager'}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {React.createElement(steps[currentStep].icon, {
                className: "w-5 h-5 text-primary"
              })}
              <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
            </div>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
        </CardHeader>

        <CardContent className="pb-6">
          {renderStep()}
        </CardContent>

        {currentStep < steps.length - 1 && (
          <div className="px-6 pb-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InitialSetupWizard;