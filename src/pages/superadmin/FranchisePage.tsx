import React, { useState } from 'react';
import { Building2, Edit, Save, X, MapPin, Users, Settings } from 'lucide-react';
import { useFranchises } from '../../contexts/FranchiseContext';
import FranchiseForm from '../../components/franchise/FranchiseForm';
import Button from '../../components/ui/Button';
import { FranchiseFormData } from '../../types';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';

const FranchisePage: React.FC = () => {
  const { franchises, loading, error, addFranchise: createFranchise, updateFranchise } = useFranchises();
  const franchise = franchises[0]; // Get first franchise if available
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFranchise = async (data: FranchiseFormData) => {
    setIsSubmitting(true);
    try {
      await createFranchise(data);
      setIsEditing(false);
    } catch (err) {
      console.error('Error creating franchise:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFranchise = async (data: FranchiseFormData) => {
    setIsSubmitting(true);
    try {
      await updateFranchise(data);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating franchise:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Franchise Management">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        ) : !franchise ? (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Franchise</h1>
                <p className="text-gray-600">Set up your franchise to get started</p>
              </div>
            </div>

            <FranchiseForm
              onSubmit={handleCreateFranchise}
              isSubmitting={isSubmitting}
              submitButtonText="Create Franchise"
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Franchise Management</h1>
                    <p className="text-gray-600">Manage your franchise details and settings</p>
                  </div>
                </div>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Franchise</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Franchise Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {isEditing ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Franchise Details</h2>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </Button>
                  </div>
                  <FranchiseForm
                    initialData={franchise}
                    onSubmit={handleUpdateFranchise}
                    isSubmitting={isSubmitting}
                    submitButtonText="Update Franchise"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-gray-900">Franchise Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Franchise Name
                      </label>
                      <p className="text-gray-900 font-medium">{franchise.name}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Owner Name
                      </label>
                      <p className="text-gray-900">{franchise.ownerName}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{franchise.email}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <p className="text-gray-900">{franchise.phone}</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <p className="text-gray-900">{franchise.address}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan
                      </label>
                      <p className="text-gray-900 capitalize">{franchise.plan}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          franchise.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {franchise.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          franchise.isApproved 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {franchise.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Enabled Features
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(franchise.features || {}).map(([feature, enabled]) => (
                        <div key={feature} className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className="text-sm text-gray-700 capitalize">
                            {feature.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {!isEditing && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Franchise Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    to="/franchise/users"
                    className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg transition-colors duration-200 block"
                  >
                    <Users className="h-6 w-6 mb-2" />
                    <h3 className="font-semibold mb-1">Manage Users</h3>
                    <p className="text-sm opacity-90">Add and manage franchise users</p>
                  </Link>
                  
                  <Link
                    to="/franchise/locations"
                    className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-lg transition-colors duration-200 block"
                  >
                    <MapPin className="h-6 w-6 mb-2" />
                    <h3 className="font-semibold mb-1">Manage Locations</h3>
                    <p className="text-sm opacity-90">Add and manage franchise locations</p>
                  </Link>
                  
                  <Link
                    to="/franchise/settings"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-lg transition-colors duration-200 block"
                  >
                    <Settings className="h-6 w-6 mb-2" />
                    <h3 className="font-semibold mb-1">Franchise Settings</h3>
                    <p className="text-sm opacity-90">Configure franchise settings</p>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FranchisePage;