import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, UserRole } from '../../types';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Users, ToggleLeft, ToggleRight, UserPlus, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import UserForm from '../../components/auth/UserForm';

const UsersPage: React.FC = () => {
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
  }, [franchise, currentUser]);

  const fetchUsers = async () => {
    if (!franchise) {
      setLoading(false);
      return;
    }
    
    try {
      // Admin/Owner sees all users from their franchise (managers and staff) for approval
      // Admin fetching users for franchise
      
      const q = query(
        collection(db, 'users'),
        where('franchiseId', '==', franchise.id),
        where('role', 'in', ['manager', 'staff'])
      );
      
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      })) as User[];
      
      // Found users for franchise
      // Users found
      setUsers(usersData);
    } catch (err: any) {
      // Error fetching users
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    // Admin cannot set anyone to superadmin or admin
    if (newRole === 'superadmin' || newRole === 'admin') {
      setError('You do not have permission to create admin or superadmin users');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      // Error updating user role
      setError(err.message || 'Failed to update user role');
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
      // Error toggling user status
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleApproveUserWithLocation = async (user: User, locationId?: string) => {
    if (!currentUser || !franchise) return;
    
    try {
      await approveUser(user.uid, locationId);
      await fetchUsers();
    } catch (err: any) {
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
        // Error rejecting user
        setError(err.message || 'Failed to reject user');
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleAddUserSuccess = () => {
    setShowAddUserForm(false);
    fetchUsers();
  };

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* Pending Approvals Section */}
        {users.filter(user => !user.isApproved).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">
                Pending Approvals ({users.filter(user => !user.isApproved).length})
              </h3>
            </div>
            <p className="text-yellow-700 mt-1">
              The following users are waiting for your approval to access the system.
            </p>
          </div>
        )}

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
          >
            <UserPlus size={18} className="mr-1" />
            Add User
          </Button>
        </div>

        {/* Franchise Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Franchise Wide Management</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>You are viewing and managing users for your franchise: <strong>{franchise?.name || 'Unknown franchise'}</strong></p>
                <p>You can approve managers and staff for your entire franchise.</p>
              </div>
            </div>
          </div>
        </div>

        {showAddUserForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <UserForm 
              onSuccess={handleAddUserSuccess}
              allowRoleSelection={true}
              franchiseId={franchise?.id}
              locations={locations}
            />
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
                      Role
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
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.uid, e.target.value as UserRole)}
                            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                          >
                            <option value="manager">Manager</option>
                            <option value="staff">Staff</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!user.isApproved ? (
                            <div className="space-y-2">
                              {/* Show location dropdown only for staff and manager */}
                              {(user.role === 'staff' || user.role === 'manager') ? (
                                <select
                                  id={`location-${user.uid}`}
                                  defaultValue={user.requestedLocationId || ""}
                                  className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-2 py-1"
                                  required
                                >
                                  <option value="">Select location *</option>
                                  {locations.map(location => (
                                    <option key={location.id} value={location.id}>
                                      {location.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                /* For Admin/Owner - show message about auto-assigning all locations */
                                <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
                                  📍 Will assign all locations
                                </div>
                              )}
                              {user.requestedLocationId && (
                                <p className="text-xs text-gray-500">
                                  Requested: {locations.find(loc => loc.id === user.requestedLocationId)?.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">
                              {user.role === 'admin' || user.role === 'owner' ? (
                                /* For Admin/Owner - show count of locations or all locations */
                                user.locationIds && user.locationIds.length > 0 ? (
                                  `${user.locationIds.length} location(s)`
                                ) : (
                                  'All locations'
                                )
                              ) : (
                                /* For Staff/Manager - show specific location */
                                user.locationId ? locations.find(loc => loc.id === user.locationId)?.name || 'Unknown location' : 'Not assigned'
                              )}
                            </span>
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
                                    if (user.role === 'staff' || user.role === 'manager') {
                                      const locationSelect = document.getElementById(`location-${user.uid}`) as HTMLSelectElement;
                                      const locationId = locationSelect?.value;
                                      
                                      if (!locationId) {
                                        alert('Please select a location before approving.');
                                        return;
                                      }
                                      
                                      handleApproveUserWithLocation(user, locationId);
                                    } else {
                                      // For Admin/Owner - approve without location selection
                                      handleApproveUserWithLocation(user);
                                    }
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

export default UsersPage;