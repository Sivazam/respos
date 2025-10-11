import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { UserRole } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';

interface RegisterFormProps {
  onSuccess?: () => void;
  allowRoleSelection?: boolean;
  isSuperAdmin?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  allowRoleSelection = false,
  isSuperAdmin = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(isSuperAdmin ? 'superadmin' : 'staff');
  const [locationId, setLocationId] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');
  
  const { register, loading, error } = useAuth();
  const { locations, loading: locationsLoading } = useLocations();
  const { franchises } = useFranchises();
  const franchise = franchises[0]; // Get first franchise if available

  // Update role when isSuperAdmin changes
  useEffect(() => {
    setRole(isSuperAdmin ? 'superadmin' : 'staff');
  }, [isSuperAdmin]);

  // Set default location if there's only one available
  useEffect(() => {
    if (locations.length === 1 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

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
    
    // For non-superadmin roles, check location requirements
    if (!isSuperAdmin && role !== 'superadmin') {
      // Check if locations are still loading
      if (locationsLoading) {
        setFormError('Please wait for locations to load');
        return;
      }
      
      // Check if no locations are available
      if (locations.length === 0) {
        setFormError('No locations available. Please contact an administrator to create locations first.');
        return;
      }
      
      // For staff, location is optional (will be assigned by admin/manager)
      // if (role === 'staff' && !locationId) {
      //   setFormError('Please select a location for restaurant staff');
      //   return;
      // }
    }

    try {
      // For super admin, don't pass franchiseId
      if (isSuperAdmin || role === 'superadmin') {
        await register(email.trim(), password, 'superadmin');
      } else {
        // For other roles, try to get the current franchise ID
        let franchiseIdToUse = franchise?.id;
        
        // If no franchise exists, try to create one automatically or use a default
        if (!franchiseIdToUse) {
          console.log('No franchise found, attempting to register without franchise ID');
          // Let the AuthContext handle the franchise creation logic
          franchiseIdToUse = undefined;
        }
        
        // Create user data object with display name
        const userData = {
          email: email.trim(),
          password,
          role,
          displayName: displayName.trim() || email.trim().split('@')[0],
          franchiseId: franchiseIdToUse,
          locationId: locationId || null
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
      
      if (onSuccess) onSuccess();
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
        { value: 'admin', label: 'Admin/Owner' },
        { value: 'manager', label: 'Manager' },
        { value: 'staff', label: 'Staff' }
      ];

  // Check if we should show location warning
  const showLocationWarning = !isSuperAdmin && role !== 'superadmin' && !locationsLoading && locations.length === 0;
  const showLocationRequired = !isSuperAdmin && role !== 'superadmin' && locations.length > 0;

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

      {showLocationWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No Locations Available
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  No locations are available for user assignment. Please contact an administrator 
                  to create locations before registering non-admin users.
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

      {/* Location selection for staff */}
      {showLocationRequired && (
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-1" />
            Assign to Location
            {/* {role === 'staff' && <span className="text-red-500 ml-1">*</span>} */}
          </label>
          {locationsLoading ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50 text-gray-500">
              Loading locations...
            </div>
          ) : locations.length === 1 ? (
            <div className="w-full rounded-md border border-gray-300 py-2 px-4 bg-gray-50">
              {locations[0].name}
              <input type="hidden" name="locationId" value={locations[0].id} />
            </div>
          ) : (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required={false}
              disabled={loading}
            >
              <option value="">
                Select a location (optional - will be assigned by admin/manager)
              </option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Optional for all roles - can be assigned by admin/manager later
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
            showLocationWarning ||
            false // Removed staff location requirement
          }
        >
          {isSuperAdmin ? "Create Super Admin Account" : "Register"}
        </Button>
      </div>
    </form>
  );
};

export default RegisterForm;