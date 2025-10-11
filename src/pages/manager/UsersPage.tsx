import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from '../../types';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Users, ToggleLeft, ToggleRight, UserPlus, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import UserForm from '../../components/auth/UserForm';

const ManagerUsersPage: React.FC = () => {
  const { currentUser, approveUser } = useAuth();
  const { franchises } = useFranchises();
  const franchise = franchises[0]; // Get first franchise if available
  const { locations } = useLocations();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  useEffect(() => {
    if (franchise) {
      fetchUsers();
    }
  }, [franchise]);

  const fetchUsers = async () => {
    if (!franchise) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching users for manager with locationId:', currentUser.locationId);
      
      // Manager can see staff from their location and franchise
      const q = query(
        collection(db, 'users'),
        where('franchiseId', '==', franchise.id),
        where('role', '==', 'staff')
      );
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      })) as User[];
      
      console.log(`Found ${usersData.length} staff for this franchise`);
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (uid: string, currentlyActive: boolean) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        isActive: !currentlyActive,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleApproveUserWithLocation = async (user: User, locationId?: string) => {
    if (!currentUser || !franchise) return;
    
    try {
      if (!locationId) {
        alert('Please select a location before approving.');
        return;
      }
      
      await approveUser(user.uid, locationId);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (user: User) => {
    if (!currentUser || !franchise) return;
    
    if (window.confirm(`Are you sure you want to reject ${user.email}? This will deactivate their account.`)) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          isActive: false,
          isApproved: false,
          updatedAt: serverTimestamp()
        });
        await fetchUsers();
      } catch (err: any) {
        console.error('Error rejecting user:', err);
        setError(err.message || 'Failed to reject user');
      }
    }
  };

  const handleAssignLocation = async (user: User, newLocationId: string) => {
    if (!currentUser || !franchise) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        locationId: newLocationId,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      console.error('Error assigning location:', err);
      setError(err.message || 'Failed to assign location');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleAddUserSuccess = () => {
    setShowAddUserForm(false);
    fetchUsers();
  };

  // Manager can only see their location
  const managerLocation = locations.find(loc => loc.id === currentUser?.locationId);
  
  // Manager can see all locations in their franchise for assignment
  const availableLocations = locations.filter(loc => loc.franchiseId === franchise?.id);

  // Check if manager has a location assigned
  const hasLocationAssigned = !!currentUser?.locationId && !!managerLocation;

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search size={18} className="text-gray-500" />}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setShowAddUserForm(true)}
            disabled={!hasLocationAssigned}
          >
            <UserPlus size={18} className="mr-1" />
            Add Staff
          </Button>
        </div>

        {/* Pending Approvals Section */}
        {users.filter(user => !user.isApproved).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">
                Pending Staff Approvals ({users.filter(user => !user.isApproved).length})
              </h3>
            </div>
            <p className="text-yellow-700 mt-1">
              The following staff members are waiting for your approval to access the system.
            </p>
          </div>
        )}

        {/* Location Info */}
        {hasLocationAssigned ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              <strong>Managing Location:</strong> {managerLocation.name} ({managerLocation.storeName})
            </p>
            <p className="text-sm text-blue-600 mt-1">
              You can manage staff assigned to this franchise.
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Users className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Location Assignment Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You need to be assigned to a location before you can add users.
                    Please contact your administrator to update your location assignment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddUserForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add New Staff</h2>
            {hasLocationAssigned ? (
              <UserForm 
                onSuccess={handleAddUserSuccess}
                allowRoleSelection={false} // Manager can only add staff
                franchiseId={franchise?.id}
                locations={availableLocations} // Only the manager's location
                defaultRole="staff"
                defaultLocationId={currentUser?.locationId}
              />
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No Locations Available
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        You need to be assigned to a location before you can add users.
                        Please contact your administrator to update your location assignment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddUserForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.uid}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">Staff</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!user.isApproved ? (
                            <div className="space-y-2">
                              <select
                                id={`location-${user.uid}`}
                                defaultValue={user.requestedLocationId || currentUser.locationId || ""}
                                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-2 py-1"
                                required
                              >
                                <option value="">Select location *</option>
                                {availableLocations.map(location => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                              {user.requestedLocationId && (
                                <p className="text-xs text-gray-500">
                                  Requested: {locations.find(loc => loc.id === user.requestedLocationId)?.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900">
                                {user.locationId ? locations.find(loc => loc.id === user.locationId)?.name || 'Unknown' : 'Not assigned'}
                              </span>
                              {availableLocations.length > 1 && (
                                <select
                                  value={user.locationId || ''}
                                  onChange={(e) => handleAssignLocation(user, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                  title="Change location"
                                >
                                  <option value="">Select location</option>
                                  {availableLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleUserStatus(user.uid, user.isActive)}
                            className="inline-flex items-center"
                          >
                            {user.isActive ? (
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isApproved ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col space-y-2 min-w-[150px]">
                            {!user.isApproved ? (
                              <div className="grid grid-cols-2 gap-1">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => {
                                    const locationSelect = document.getElementById(`location-${user.uid}`) as HTMLSelectElement;
                                    const locationId = locationSelect?.value;
                                    
                                    if (!locationId) {
                                      alert('Please select a location before approving.');
                                      return;
                                    }
                                    
                                    handleApproveUserWithLocation(user, locationId);
                                  }}
                                  className="text-xs px-2 py-1"
                                >
                                  <CheckCircle size={12} className="mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRejectUser(user)}
                                  className="text-xs px-2 py-1"
                                >
                                  <XCircle size={12} className="mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleUserStatus(user.uid, user.isActive)}
                                className="text-xs px-2 py-1"
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagerUsersPage;