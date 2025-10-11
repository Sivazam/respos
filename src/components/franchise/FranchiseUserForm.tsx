import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';

interface FranchiseUserFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: User | null;
  locations: any[];
  franchiseId?: string;
}

const FranchiseUserForm: React.FC<FranchiseUserFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  locations,
  franchiseId
}) => {
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    confirmPassword: '',
    role: initialData?.role || 'staff' as UserRole,
    locationId: initialData?.locationId || '',
    isActive: initialData?.isActive ?? true
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.email) {
      setError('Email is required');
      return;
    }
    
    if (!initialData) {
      if (!formData.password) {
        setError('Password is required');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      if (initialData) {
        // Update existing user
        await onSubmit({
          role: formData.role,
          locationId: formData.locationId,
          isActive: formData.isActive
        });
      } else {
        // Create new user
        if (!franchiseId) {
          throw new Error('Franchise ID is required');
        }
        
        await register(formData.email, formData.password, formData.role, franchiseId);
        await onSubmit({
          email: formData.email,
          role: formData.role,
          locationId: formData.locationId,
          isActive: formData.isActive
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      
      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="user@example.com"
        disabled={!!initialData}
        required
      />
      
      {!initialData && (
        <>
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="********"
            required
          />
          
          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="********"
            required
          />
        </>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location
        </label>
        <select
          name="locationId"
          value={formData.locationId}
          onChange={handleChange}
          className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">No specific location</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Active
        </label>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
        >
          {initialData ? 'Update' : 'Add'} User
        </Button>
      </div>
    </form>
  );
};

export default FranchiseUserForm;