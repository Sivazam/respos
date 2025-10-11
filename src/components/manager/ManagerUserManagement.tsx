import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { Edit2, Check, X, MapPin, Calendar, UserCheck, UserX, Phone } from 'lucide-react';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';
import { format } from 'date-fns';

interface ManagerUserManagementProps {
  onClose?: () => void;
}

interface StaffUser extends User {
  requestedLocationId?: string;
}

const ManagerUserManagement: React.FC<ManagerUserManagementProps> = ({ onClose }) => {
  const { currentUser, approveUser } = useAuth();
  const { locations } = useLocations();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUsers = useCallback(async () => {
    if (!currentUser?.franchiseId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('franchiseId', '==', currentUser.franchiseId),
        where('role', '==', 'staff')
      );
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate() || new Date()
      })) as StaffUser[];
      
      setUsers(usersData);
    } catch (err: unknown) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.franchiseId]);

  const handleApproveUser = async (user: StaffUser, locationId: string) => {
    try {
      setLoading(true);
      
      // Get location details to verify it belongs to the same franchise
      const locationDoc = await getDoc(doc(db, 'locations', locationId));
      if (!locationDoc.exists()) {
        setError('Selected location not found');
        return;
      }
      
      const locationData = locationDoc.data();
      if (locationData.franchiseId !== currentUser?.franchiseId) {
        setError('You can only assign users to locations in your franchise');
        return;
      }
      
      await approveUser(user.uid, locationId);
      await fetchUsers();
      setEditingUser(null);
      setSelectedLocation('');
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = async (user: StaffUser) => {
    if (window.confirm(`Are you sure you want to reject ${user.displayName || user.email}?`)) {
      try {
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isApproved: false,
          isActive: false,
          requestedLocationId: null,
          updatedAt: serverTimestamp()
        });
        
        await fetchUsers();
      } catch (err: unknown) {
        console.error('Error rejecting user:', err);
        setError(err instanceof Error ? err.message : 'Failed to reject user');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleStatus = async (user: StaffUser) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isActive: !user.isActive,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: unknown) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (user: StaffUser, newLocationId: string) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      
      // Get location details to verify it belongs to the same franchise
      const locationDoc = await getDoc(doc(db, 'locations', newLocationId));
      if (!locationDoc.exists()) {
        setError('Selected location not found');
        return;
      }
      
      const locationData = locationDoc.data();
      if (locationData.franchiseId !== currentUser?.franchiseId) {
        setError('You can only assign users to locations in your franchise');
        return;
      }
      
      await updateDoc(userRef, {
        locationId: newLocationId,
        updatedAt: serverTimestamp()
      });
      
      await fetchUsers();
      setEditingUser(null);
      setSelectedLocation('');
    } catch (err: unknown) {
      console.error('Error updating user location:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user location');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (user: StaffUser) => {
    if (!user.isApproved) {
      return { text: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (user.isActive) {
      return { text: 'Active', color: 'bg-green-100 text-green-800' };
    }
    return { text: 'Inactive', color: 'bg-red-100 text-red-800' };
  };

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return 'Not Assigned';
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const getRequestedLocationName = (locationId: string | null) => {
    if (!locationId) return 'None';
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const availableLocations = locations.filter(loc => loc.franchiseId === currentUser?.franchiseId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600">Manage staff members for your locations</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading staff members...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No staff members found in your franchise.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const status = getStatusBadge(user);
                  const isEditing = editingUser?.uid === user.uid;
                  
                  return (
                    <tr key={user.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400 flex items-center mt-1">
                              <Phone size={12} className="mr-1" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Select Location</option>
                            {availableLocations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center text-sm text-gray-900">
                            <MapPin size={14} className="mr-1" />
                            {getLocationName(user.locationId)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {getRequestedLocationName(user.requestedLocationId || null)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {format(user.createdAt, 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!user.isApproved ? (
                            <>
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => selectedLocation && handleApproveUser(user, selectedLocation)}
                                    disabled={!selectedLocation || loading}
                                  >
                                    <Check size={14} className="mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(null);
                                      setSelectedLocation('');
                                    }}
                                  >
                                    <X size={14} />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      setSelectedLocation(user.requestedLocationId || '');
                                    }}
                                  >
                                    <UserCheck size={14} className="mr-1" />
                                    Review
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleRejectUser(user)}
                                  >
                                    <UserX size={14} />
                                  </Button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {isEditing ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => selectedLocation && handleUpdateLocation(user, selectedLocation)}
                                    disabled={!selectedLocation || loading}
                                  >
                                    <Check size={14} className="mr-1" />
                                    Update
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(null);
                                      setSelectedLocation('');
                                    }}
                                  >
                                    <X size={14} />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user);
                                    setSelectedLocation(user.locationId || '');
                                  }}
                                >
                                  <Edit2 size={14} className="mr-1" />
                                  Change Location
                                </Button>
                              )}
                              <Button
                                variant={user.isActive ? 'outline' : 'secondary'}
                                size="sm"
                                onClick={() => handleToggleStatus(user)}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerUserManagement;