import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useLocations } from '../../contexts/LocationContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { Location, LocationFormData } from '../../types';
import InitialSetupWizard from '../../components/InitialSetupWizard';
import { 
  Store, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  MapPin,
  Phone,
  Mail,
  Building,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const LocationsPage: React.FC = () => {
  const { 
    locations, 
    loading, 
    error, 
    addLocation, 
    updateLocation, 
    deleteLocation, 
    refreshLocations,
    getLocationsByFranchise 
  } = useLocations();
  
  const { franchises } = useFranchises();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [createdLocationId, setCreatedLocationId] = useState<string>('');
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    storeName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter locations based on search and filters
  const filteredLocations = locations.filter(location => {
    const matchesSearch = 
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.phone?.includes(searchTerm) ||
      location.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFranchise = selectedFranchise === 'all' || location.franchiseId === selectedFranchise;
    const matchesStatus = showInactive || location.isActive;
    
    return matchesSearch && matchesFranchise && matchesStatus;
  });

  // Get franchise name by ID
  const getFranchiseName = (franchiseId: string) => {
    const franchise = franchises.find(f => f.id === franchiseId);
    return franchise?.name || 'Unknown Franchise';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.storeName || !formData.address) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      let newLocation;
      if (editingLocation) {
        await updateLocation(editingLocation.id, formData);
      } else {
        // For new locations, we need to get the franchise ID from the form or selection
        if (!selectedFranchise || selectedFranchise === 'all') {
          alert('Please select a franchise for the new location');
          return;
        }
        // Create location data with franchiseId
        const locationDataWithFranchise = {
          ...formData,
          franchiseId: selectedFranchise
        };
        newLocation = await addLocation(locationDataWithFranchise);
        // Store the new location ID and show setup wizard
        if (newLocation?.id) {
          setCreatedLocationId(newLocation.id);
          setShowSetupWizard(true);
        }
      }
      
      // Reset form
      setFormData({
        name: '',
        storeName: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: ''
      });
      setEditingLocation(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Error saving location:', error);
      alert(error.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      storeName: location.storeName,
      address: location.address,
      phone: location.phone || '',
      email: location.email || '',
      gstNumber: location.gstNumber || ''
    });
    setSelectedFranchise(location.franchiseId);
    setIsFormOpen(true);
  };

  // Handle delete
  const handleDelete = async (location: Location) => {
    console.log('handleDelete called with location:', location);
    console.log('location.id:', location.id, 'Type:', typeof location.id);
    
    if (!confirm(`Are you sure you want to delete "${location.storeName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteLocation(location.id);
    } catch (error: any) {
      console.error('Error deleting location:', error);
      alert(error.message || 'Failed to delete location');
    }
  };

  // Toggle location status
  const toggleStatus = async (location: Location) => {
    try {
      await updateLocation(location.id, { 
        isActive: !location.isActive
      });
      await refreshLocations();
    } catch (error: any) {
      console.error('Error toggling location status:', error);
      alert(error.message || 'Failed to update location status');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      storeName: '',
      address: '',
      phone: '',
      email: '',
      gstNumber: ''
    });
    setEditingLocation(null);
    setIsFormOpen(false);
  };

  // Handle setup wizard completion
  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    setCreatedLocationId('');
    refreshLocations();
  };

  return (
    <DashboardLayout title="Location Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Store Locations</h2>
              <p className="text-gray-600 mt-1">Manage all franchise store locations</p>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Location
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Franchise Filter */}
            <select
              value={selectedFranchise}
              onChange={(e) => setSelectedFranchise(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Franchises</option>
              {franchises.map(franchise => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={showInactive ? 'all' : 'active'}
              onChange={(e) => setShowInactive(e.target.value === 'all')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="active">Active Only</option>
              <option value="all">All Status</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={refreshLocations}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <Filter className="w-5 h-5 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.filter(l => l.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">
                  {locations.filter(l => !l.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Franchises</p>
                <p className="text-2xl font-bold text-gray-900">{franchises.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading locations...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="p-8 text-center">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No locations found</p>
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
                      Franchise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {location.storeName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {location.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {location.address}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getFranchiseName(location.franchiseId)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {location.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {location.phone}
                            </div>
                          )}
                          {location.email && (
                            <div className="flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="truncate max-w-[150px]">{location.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          location.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {location.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(location)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit location"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleStatus(location)}
                            className={`${
                              location.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                            }`}
                            title={location.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {location.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(location)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Location Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {editingLocation ? 'Edit Location' : 'Add New Location'}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Franchise Selection (only for new locations) */}
                      {!editingLocation && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Franchise *
                          </label>
                          <select
                            value={selectedFranchise}
                            onChange={(e) => setSelectedFranchise(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                          >
                            <option value="">Select a franchise</option>
                            {franchises.map(franchise => (
                              <option key={franchise.id} value={franchise.id}>
                                {franchise.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Location Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="e.g., ramachandrapuram"
                          required
                        />
                      </div>

                      {/* Store Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Store Display Name *
                        </label>
                        <input
                          type="text"
                          value={formData.storeName}
                          onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="e.g., Na Potta Na Istam - Main Store"
                          required
                        />
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address *
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          rows={3}
                          placeholder="Full address"
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Phone number"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Email address"
                        />
                      </div>

                      {/* GST Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST Number
                        </label>
                        <input
                          type="text"
                          value={formData.gstNumber}
                          onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="GST number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving...' : (editingLocation ? 'Update' : 'Create')}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Initial Setup Wizard */}
      <InitialSetupWizard
        isOpen={showSetupWizard}
        onComplete={handleSetupComplete}
        locationId={createdLocationId}
      />
    </DashboardLayout>
  );
};

export default LocationsPage;