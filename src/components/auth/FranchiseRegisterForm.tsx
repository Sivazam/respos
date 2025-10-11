import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, MapPin, AlertCircle, Building } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import { UserRole } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';

interface FranchiseRegisterFormProps {
  onSuccess?: (email?: string) => void;
  allowRoleSelection?: boolean;
  isSuperAdmin?: boolean;
}

const FranchiseRegisterForm: React.FC<FranchiseRegisterFormProps> = ({
  onSuccess,
  allowRoleSelection = false,
  isSuperAdmin = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(isSuperAdmin ? 'superadmin' : 'staff');
  const [franchiseId, setFranchiseId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');
  
  const { register, loading, error } = useAuth();
  const { franchises, loading: franchisesLoading } = useFranchises();
  const { locations, loading: locationsLoading } = useLocations();

  // Update role when isSuperAdmin changes
  useEffect(() => {
    setRole(isSuperAdmin ? 'superadmin' : 'staff');
  }, [isSuperAdmin]);

  // Filter locations based on selected franchise
  const availableLocations = franchiseId 
    ? locations.filter(location => location.franchiseId === franchiseId)
    : [];

  // Set default location if there's only one available
  useEffect(() => {
    if (availableLocations.length === 1 && !locationId) {
      setLocationId(availableLocations[0].id);
    }
  }, [availableLocations, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    // Basic validation
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    // For non-superadmin roles, check franchise requirements
    if (!isSuperAdmin && role !== 'superadmin') {
      // Check if franchises are still loading
      if (franchisesLoading) {
        setFormError('Please wait for franchises to load');
        return;
      }
      
      // Check if no franchises are available
      if (franchises.length === 0) {
        setFormError('No franchises available. Please contact an administrator to create franchises first.');
        return;
      }
      
      // Franchise selection is required for all non-superadmin roles
      if (!franchiseId) {
        setFormError('Please select a franchise');
        return;
      }
      
      // For staff, location selection is required
      if (role === 'staff' && !locationId && availableLocations.length > 0) {
        setFormError('Please select a location for restaurant staff');
        return;
      }
    }

    try {
      // For super admin, don't pass franchiseId
      if (isSuperAdmin || role === 'superadmin') {
        await register(email.trim(), password, 'superadmin');
      } else {
        // Create user data object with display name
        const userData = {
          email: email.trim(),
          password,
          role,
          displayName: displayName.trim() || email.trim().split('@')[0],
          franchiseId: franchiseId,
          locationId: role === 'staff' ? locationId : null // Only staff gets location on registration
        };
        
        console.log('Registering user with data:', {
          ...userData,
          password: '[REDACTED]'
        });
        
        // Register the user
        await register(
          userData.email, 
          userData.password, 
          userData.role, 
          userData.franchiseId, 
          userData.locationId
        );
      }
      
      if (onSuccess) onSuccess(email.trim());
    } catch (err: any) {
      // Error is already handled in AuthContext and will be displayed via the error prop
      console.error('Registration form error:', err);
    }
  };

  // Clear form error when auth error changes
  React.useEffect(() => {
    if (error) {
      setFormError('');
    }
  }, [error]);

  const displayError = formError || error;

  // Available roles based on user type
  const availableRoles = isSuperAdmin 
    ? [{ value: 'superadmin', label: 'Super Admin' }] 
    : [
        { value: 'admin', label: 'Restaurant Admin (Owner)' },
        { value: 'manager', label: 'Restaurant Manager' },
        { value: 'staff', label: 'Restaurant Staff' }
      ];

  // Check if we should show franchise warning
  const showFranchiseWarning = !isSuperAdmin && role !== 'superadmin' && !franchisesLoading && franchises.length === 0;
  const showFranchiseRequired = !isSuperAdmin && role !== 'superadmin' && franchises.length > 0;
  
  // Check if we should show location selection
  const showLocationSelection = showFranchiseRequired && franchiseId && availableLocations.length > 0;
  const showLocationRequired = role === 'staff' && showLocationSelection;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displayError && (
        <ErrorAlert
          message={displayError}
          onClose={() => {
            setFormError('');
            // Note: We don't clear the auth error here as it's managed by AuthContext
          }}
        />
      )}

      {showFranchiseWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No Franchises Available
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  No franchises are available for registration. Please contact a super administrator 
                  to create franchises before registering users.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Input
        label="Email"
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        autoComplete="email"
        icon={<Mail size={18} className="text-gray-500" />}
        required
        disabled={loading}
      />
      
      <Input
        label="Display Name"
        type="text"
        id="displayName"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Full Name"
        autoComplete="name"
        icon={<User size={18} className="text-gray-500" />}
        disabled={loading}
      />
      
      <Input
        label="Password"
        type="password"
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="********"
        autoComplete="new-password"
        icon={<Lock size={18} className="text-gray-500" />}
        required
        disabled={loading}
      />
      
      <Input
        label="Confirm Password"
        type="password"
        id="confirmPassword"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="********"
        autoComplete="new-password"
        icon={<Lock size={18} className="text-gray-500" />}
        required
        disabled={loading}
      />
      
      {allowRoleSelection && !isSuperAdmin && (
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={loading}
          >
            {availableRoles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Franchise selection for non-superadmin roles */}
      {showFranchiseRequired && (
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Building size={16} className="inline mr-1" />
            Select Franchise
            <span className="text-red-500 ml-1">*</span>
          </label>
          {franchisesLoading ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50 text-gray-500">
              Loading franchises...
            </div>
          ) : franchises.length === 1 ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50">
              {franchises[0].name}
              <input type="hidden" name="franchiseId" value={franchises[0].id} />
            </div>
          ) : (
            <select
              value={franchiseId}
              onChange={(e) => {
                setFranchiseId(e.target.value);
                setLocationId(''); // Reset location when franchise changes
              }}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select a franchise</option>
              {franchises.map(franchise => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Select the franchise you want to register for (admin approval required)
          </p>
        </div>
      )}

      {/* Location selection for staff */}
      {showLocationSelection && (
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-1" />
            Assign to Location
            {showLocationRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {locationsLoading ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50 text-gray-500">
              Loading locations...
            </div>
          ) : availableLocations.length === 1 ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50">
              {availableLocations[0].name}
              <input type="hidden" name="locationId" value={availableLocations[0].id} />
            </div>
          ) : (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required={showLocationRequired}
              disabled={loading}
            >
              <option value="">
                {showLocationRequired ? 'Select a location (required)' : 'Select a location (optional)'}
              </option>
              {availableLocations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {showLocationRequired ? 'Required for restaurant staff' : 'Optional for admin/manager (will be assigned during approval)'}
          </p>
        </div>
      )}
      
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={loading}
          disabled={
            loading || 
            !email.trim() || 
            !password || 
            password !== confirmPassword ||
            showFranchiseWarning ||
            (showFranchiseRequired && !franchiseId) ||
            (showLocationRequired && !locationId)
          }
        >
          {isSuperAdmin ? "Create Super Admin Account" : "Register"}
        </Button>
      </div>
    </form>
  );
};

export default FranchiseRegisterForm;