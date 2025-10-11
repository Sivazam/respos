import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import { Link } from 'react-router-dom';
import { MapPin, Users, Settings, Building2, Plus } from 'lucide-react';
import Button from '../../components/ui/Button';

const FranchiseDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { franchises } = useFranchises();
  const { locations } = useLocations();

  // Helper function to safely get plan badge color
  const getPlanBadgeColor = (plan: string | undefined) => {
    switch (plan) {
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to safely display plan name
  const getPlanDisplayName = (plan: string | undefined) => {
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'N/A';
  };

  // Get current franchise
  const currentFranchise = franchises.find(f => f.id === currentUser?.franchiseId);
  
  // Get franchise locations
  const franchiseLocations = locations.filter(l => l.franchiseId === currentUser?.franchiseId);

  // Safe access to franchise properties
  const franchisePlan = currentFranchise?.subscriptionPlan || currentFranchise?.plan;
  const franchiseFeatures = currentFranchise?.features || currentFranchise?.settings?.features || {};

  return (
    <DashboardLayout title="Franchise Dashboard">
      <div className="space-y-6">
        {/* Franchise Info */}
        {currentFranchise && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium text-gray-900">{currentFranchise.name}</h2>
                <p className="text-gray-600">Owner: {currentFranchise.ownerName}</p>
                <p className="text-gray-600">Plan: {getPlanDisplayName(franchisePlan)}</p>
                <p className="text-gray-600">Commission Rate: {currentFranchise.commissionRate || 0}%</p>
              </div>
              <div className="flex space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(franchisePlan)}`}>
                  {getPlanDisplayName(franchisePlan)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentFranchise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {currentFranchise.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <MapPin className="h-6 w-6 text-blue-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Locations
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {franchiseLocations.length}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <Building2 className="h-6 w-6 text-green-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Locations
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {franchiseLocations.filter(l => l.isActive).length}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <Settings className="h-6 w-6 text-purple-700" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Features
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {Object.values(franchiseFeatures).filter(Boolean).length}
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            to="/franchise/locations"
            className="bg-blue-50 rounded-lg shadow p-6 hover:bg-blue-100 transition-colors duration-200"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-medium text-gray-900">Manage Locations</h3>
                <p className="text-gray-600 mt-1">Add and manage your franchise locations</p>
              </div>
            </div>
          </Link>

          <div className="bg-gray-50 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <Users className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-medium text-gray-900">User Management</h3>
                <p className="text-gray-600 mt-1">Manage franchise staff and permissions</p>
                <p className="text-sm text-gray-500 mt-2">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locations List */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Your Locations</h3>
            <Link to="/franchise/locations">
              <Button variant="primary" size="sm">
                <Plus size={16} className="mr-1" />
                Add Location
              </Button>
            </Link>
          </div>
          
          {franchiseLocations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No locations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first location.</p>
              <div className="mt-6">
                <Link to="/franchise/locations">
                  <Button variant="primary">
                    <Plus size={18} className="mr-2" />
                    Add Location
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {franchiseLocations.map(location => (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{location.storeName}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      location.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                  {location.phone && (
                    <p className="text-sm text-gray-500">📞 {location.phone}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Overview */}
        {currentFranchise && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`text-center p-3 rounded-lg ${
                franchiseFeatures.returns ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-1 ${
                  franchiseFeatures.returns ? 'text-green-600' : 'text-red-600'
                }`}>
                  {franchiseFeatures.returns ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">Returns</div>
              </div>
              
              <div className={`text-center p-3 rounded-lg ${
                franchiseFeatures.inventory ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-1 ${
                  franchiseFeatures.inventory ? 'text-green-600' : 'text-red-600'
                }`}>
                  {franchiseFeatures.inventory ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">Inventory</div>
              </div>
              
              <div className={`text-center p-3 rounded-lg ${
                franchiseFeatures.reports ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-1 ${
                  franchiseFeatures.reports ? 'text-green-600' : 'text-red-600'
                }`}>
                  {franchiseFeatures.reports ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">Reports</div>
              </div>
              
              <div className={`text-center p-3 rounded-lg ${
                franchiseFeatures.multiLocation ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-1 ${
                  franchiseFeatures.multiLocation ? 'text-green-600' : 'text-red-600'
                }`}>
                  {franchiseFeatures.multiLocation ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">Multi-Location</div>
              </div>
              
              <div className={`text-center p-3 rounded-lg ${
                franchiseFeatures.apiAccess || franchiseFeatures.api ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`text-2xl mb-1 ${
                  franchiseFeatures.apiAccess || franchiseFeatures.api ? 'text-green-600' : 'text-red-600'
                }`}>
                  {franchiseFeatures.apiAccess || franchiseFeatures.api ? '✅' : '❌'}
                </div>
                <div className="text-sm font-medium">API Access</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FranchiseDashboard;