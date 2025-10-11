import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, MapPin, Building, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, Franchise, Location } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface AdminRegisterFormProps {
  onSuccess?: () => void;
}

const AdminRegisterForm: React.FC<AdminRegisterFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [displayName, setDisplayName] = useState('');
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [formError, setFormError] = useState('');
  
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [franchisesLoading, setFranchisesLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(false);
  
  const { register, loading, error } = useAuth();

  // Fetch all franchises on component mount
  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        setFranchisesLoading(true);
        const q = query(collection(db, 'franchises'), orderBy('createdAt', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const franchisesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          approvedAt: doc.data().approvedAt?.toDate(),
          subscriptionStartDate: doc.data().subscriptionStartDate?.toDate(),
          subscriptionEndDate: doc.data().subscriptionEndDate?.toDate()
        })) as Franchise[];
        
        // Filter for approved and active franchises only
        const approvedFranchises = franchisesData.filter(franchise => 
          franchise.isApproved && franchise.isActive
        );
        
        setFranchises(approvedFranchises);
        console.log(`Fetched ${franchisesData.length} total franchises, ${approvedFranchises.length} approved and active`);
        
        if (franchisesData.length === 0) {
          console.log('No franchises found in database at all');
        } else if (approvedFranchises.length === 0) {
          console.log('Found franchises but none are approved and active');
          franchisesData.forEach(franchise => {
            console.log(`- ${franchise.name}: approved=${franchise.isApproved}, active=${franchise.isActive}`);
          });
        }
      } catch (err: any) {
        console.error('Error fetching franchises:', err);
        setFormError('Failed to load available franchises. Please try again.');
      } finally {
        setFranchisesLoading(false);
      }
    };

    fetchFranchises();
  }, []);

  // Fetch locations when a franchise is selected
  useEffect(() => {
    const fetchLocations = async () => {
      if (!selectedFranchiseId) {
        setLocations([]);
        return;
      }

      try {
        setLocationsLoading(true);
        const q = query(
          collection(db, 'locations'),
          orderBy('name', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        const locationsData = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }) as Location[])
          .filter(location => location.franchiseId === selectedFranchiseId);
        
        setLocations(locationsData);
        console.log(`Fetched ${locationsData.length} locations for franchise ${selectedFranchiseId}`);
        
        // Auto-select first location if there's only one and role is staff
        if (locationsData.length === 1 && role === 'staff') {
          setSelectedLocationId(locationsData[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching locations:', err);
        setFormError('Failed to load locations for selected franchise. Please try again.');
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, [selectedFranchiseId]);

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
    
    if (!selectedFranchiseId) {
      setFormError('Please select a franchise');
      return;
    }
    
    // For staff, location is required
    if (role === 'staff' && !selectedLocationId) {
      setFormError('Please select a location for restaurant staff');
      return;
    }

    try {
      await register(
        email.trim(), 
        password, 
        role, 
        selectedFranchiseId, 
        selectedLocationId || null
      );
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Registration form error:', err);
      // Error is already handled in AuthContext
    }
  };

  // Clear form error when auth error changes
  React.useEffect(() => {
    if (error) {
      setFormError('');
    }
  }, [error]);

  const displayError = formError || error;

  // Available roles for admin registration
  const availableRoles = [
    { value: 'admin', label: 'Restaurant Admin (Owner)' },
    { value: 'manager', label: 'Restaurant Manager' },
    { value: 'staff', label: 'Restaurant Staff' }
  ];

  const showLocationRequired = selectedFranchiseId && locations.length > 0;
  const showLocationWarning = selectedFranchiseId && !locationsLoading && locations.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displayError && (
        <ErrorAlert
          message={displayError}
          onClose={() => setFormError('')}
        />
      )}

      {franchisesLoading ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Loading Available Franchises
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Please wait while we load the available franchises...</p>
              </div>
            </div>
          </div>
        </div>
      ) : franchises.length === 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                No Franchises Available
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  No approved franchises are available for user registration. This could mean:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>No franchises have been created yet</li>
                  <li>Existing franchises are not approved</li>
                  <li>Existing franchises are suspended</li>
                </ul>
                <p className="mt-2">
                  Please contact a super administrator to create and approve franchises before registering users.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building size={16} className="inline mr-1" />
              Select Franchise
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={selectedFranchiseId}
              onChange={(e) => {
                setSelectedFranchiseId(e.target.value);
                setSelectedLocationId(''); // Reset location when franchise changes
              }}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select a franchise</option>
              {franchises.map(franchise => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name} - {franchise.email}
                </option>
              ))}
            </select>
          </div>

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
                      The selected franchise has no locations. Please contact an administrator 
                      to create locations for this franchise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location selection for staff */}
          {showLocationRequired && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin size={16} className="inline mr-1" />
                Assign to Location
                {role === 'staff' && <span className="text-red-500 ml-1">*</span>}
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
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required={role === 'staff'}
                  disabled={loading}
                >
                  <option value="">
                    {role === 'staff' ? 'Select a location (required)' : 'Select a location (optional)'}
                  </option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {role === 'staff' ? 'Required for restaurant staff' : 'Optional for admin/manager'}
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
                !selectedFranchiseId ||
                (role === 'staff' && !selectedLocationId) ||
                showLocationWarning
              }
            >
              Register Admin User
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default AdminRegisterForm;