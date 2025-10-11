import React, { useState, useEffect } from 'react';
import { Location } from '../../types';
import { useLocations } from '../../contexts/LocationContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface LocationFormProps {
  location?: Location;
  onClose: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ location, onClose }) => {
  const { addLocation, updateLocation } = useLocations();
  const [formData, setFormData] = useState({
    name: '',
    storeName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    description: '',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        storeName: location.storeName || '',
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        zipCode: location.zipCode || '',
        phone: location.phone || '',
        email: location.email || '',
        description: location.description || '',
        isActive: location.isActive
      });
    }
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.name.trim()) {
      setError('Location name is required');
      return;
    }
    
    if (!formData.storeName.trim()) {
      setError('Store name is required');
      return;
    }
    
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }
    
    try {
      setLoading(true);
      
      if (location) {
        await updateLocation(location.id, formData);
      } else {
        await addLocation(formData);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {location ? 'Edit Location' : 'Add New Location'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Location Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Downtown Branch"
            required
          />
          
          <Input
            label="Store Name"
            name="storeName"
            value={formData.storeName}
            onChange={handleChange}
            placeholder="e.g., ForkFlow - Downtown"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address"
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={2}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
          />
          
          <Input
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="State"
          />
          
          <Input
            label="Zip Code"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            placeholder="Zip Code"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone number"
          />
          
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Additional details about this location"
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Location is active
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
          >
            {location ? 'Update' : 'Create'} Location
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LocationForm;