import React, { useState } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useLocations } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { Location } from '../../types';
import LocationForm from '../../components/location/LocationForm';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';

const LocationsPage: React.FC = () => {
  const { locations, loading, error, addLocation, updateLocation, deleteLocation } = useLocations();
  const { currentUser } = useAuth();
  const { currentFranchise } = useFranchises();
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleToggleActive = async (location: Location) => {
    try {
      await updateLocation(location.id, {
        ...location,
        isActive: !location.isActive
      });
    } catch (err) {
      console.error('Failed to toggle location status:', err);
    }
  };

  const handleSubmit = async (data: Partial<Location>) => {
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, data);
      } else {
        await addLocation(data);
      }
      setShowForm(false);
      setEditingLocation(null);
    } catch (err) {
      console.error('Failed to save location:', err);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Locations Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingLocation(null);
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-1" />
            Add Location
          </Button>
        </div>

        {showForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </h2>
            <LocationForm
              onSubmit={handleSubmit}
              initialData={editingLocation || undefined}
              onCancel={() => {
                setShowForm(false);
                setEditingLocation(null);
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading locations...</p>
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No locations found matching your search.' : 'No locations added yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Store Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLocations.map(location => (
                      <tr key={location.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{location.storeName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{location.address}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {location.phone && <div>📞 {location.phone}</div>}
                            {location.email && <div>✉️ {location.email}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(location)}
                            className="inline-flex items-center"
                          >
                            {location.isActive ? (
                              <>
                                <ToggleRight className="h-5 w-5 text-green-500 mr-1" />
                                <span className="text-sm text-green-700">Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-5 w-5 text-red-500 mr-1" />
                                <span className="text-sm text-red-700">Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(location)}
                            className="mr-2"
                          >
                            <Edit2 size={16} className="mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LocationsPage;