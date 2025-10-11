import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useLocations } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, Store, Phone, Mail } from 'lucide-react';
import ErrorAlert from '../../components/ui/ErrorAlert';

const LocationsPage: React.FC = () => {
  const { locations, error } = useLocations();
  const { currentUser } = useAuth();

  return (
    <DashboardLayout title="Locations">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} onClose={() => {}} />}

        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Store Locations</h2>
          <p className="text-gray-600">View available store locations</p>
        </div>

        {/* Info message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Location Management</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Locations can only be added by Super Admin users. Please contact your system administrator if you need to add a new location.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div key={location.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {location.storeName}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      location.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="text-sm text-gray-600">
                    <div>{location.address}</div>
                    <div>{location.city}, {location.state} {location.zipCode}</div>
                  </div>
                </div>

                {location.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{location.phone}</span>
                  </div>
                )}

                {location.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{location.email}</span>
                  </div>
                )}
              </div>

              {location.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{location.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {locations.length === 0 && (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No locations available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please contact your Super Admin to add store locations.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LocationsPage;