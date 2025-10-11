import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User, UserRole } from '../../types';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ToggleLeft, ToggleRight, UserPlus, Search, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useLocations } from '../../contexts/LocationContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useAuth } from '../../contexts/AuthContext';
import UserForm from '../../components/auth/UserForm';

const SuperAdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const { locations } = useLocations();
  const { franchises } = useFranchises();
  const { approveUser, rejectUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          isApproved: data.isApproved ?? false, // Default to false if not present
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate() || new Date()
        } as User;
      });
      
      console.log('All users in system:', usersData.map(u => ({ 
        email: u.email, 
        role: u.role, 
        franchiseId: u.franchiseId,
        isApproved: u.isApproved 
      })));
      
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (uid: string, newRole: UserRole) => {
    try {
      // Check if trying to change role to superadmin
      if (newRole === 'superadmin') {
        // Count existing superadmins
        const existingSuperAdmins = users.filter(u => u.role === 'superadmin');
        if (existingSuperAdmins.length > 0 && existingSuperAdmins[0].uid !== uid) {
          setError('Only one Super Admin is allowed in the system. Please change the existing Super Admin role first.');
          return;
        }
      }
      
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        role: newRole,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    }
  };

  const updateUserLocation = async (uid: string, locationId: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { 
        locationId: locationId || null,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      console.error('Error updating user location:', err);
      setError(err.message || 'Failed to update user location');
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

  const deleteUser = async (uid: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        await fetchUsers();
      } catch (err: any) {
        console.error('Error deleting user:', err);
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  const handleRejectUser = async (uid: string) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    try {
      await rejectUser(uid, reason || undefined);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error rejecting user:', err);
      setError(err.message || 'Failed to reject user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getFranchiseName = (franchiseId?: string) => {
    if (!franchiseId) return 'No franchise';
    const franchise = franchises.find(f => f.id === franchiseId);
    return franchise ? franchise.name : 'Unknown franchise';
  };

  const getLocationsForFranchise = (franchiseId?: string) => {
    if (!franchiseId) return [];
    return locations.filter(loc => loc.franchiseId === franchiseId);
  };

  const handleApproveWithLocation = async (uid: string, locationId?: string) => {
    try {
      await approveUser(uid, locationId);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
    }
  };

  const handleAddUserSuccess = () => {
    setShowAddUserForm(false);
    fetchUsers();
  };

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
          >
            <UserPlus size={18} className="mr-1" />
            Add User
          </Button>
        </div>

        {showAddUserForm ? (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add New User</h2>
            <UserForm 
              onSuccess={handleAddUserSuccess}
              allowRoleSelection={true}
              locations={locations}
              allowSuperAdmin={true}
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
                      Franchise
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
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
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
                          {user.role === 'superadmin' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              Super Admin
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.uid, e.target.value as UserRole)}
                              className="text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-1"
                            >
                              <option value="admin">Admin/Owner</option>
                              <option value="manager">Manager</option>
                              <option value="staff">Staff</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getFranchiseName(user.franchiseId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'superadmin' ? (
                            <span className="text-sm text-gray-500">N/A</span>
                          ) : !user.isApproved ? (
                            /* For unapproved users - show location selection */
                            <div className="space-y-2">
                              {(user.role === 'staff' || user.role === 'manager') ? (
                                <select
                                  id={`location-${user.uid}`}
                                  defaultValue=""
                                  className="text-sm rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 w-full"
                                >
                                  <option value="">Select location</option>
                                  {getLocationsForFranchise(user.franchiseId).map(location => (
                                    <option key={location.id} value={location.id}>
                                      {location.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                /* For Admin/Owner - show message about auto-assigning all locations */
                                <div className="p-2 bg-blue-50 rounded text-sm text-blue-700">
                                  📍 All locations
                                </div>
                              )}
                              {user.requestedLocationId && (
                                <p className="text-xs text-gray-500">
                                  Requested: {getLocationsForFranchise(user.franchiseId).find(loc => loc.id === user.requestedLocationId)?.name}
                                </p>
                              )}
                            </div>
                          ) : (
                            /* For approved users - show current location */
                            <span className="text-sm text-gray-900">
                              {user.role === 'admin' || user.role === 'owner' ? (
                                /* For Admin/Owner - show count of locations or all locations */
                                user.locationIds && user.locationIds.length > 0 ? (
                                  `${user.locationIds.length} location(s)`
                                ) : (
                                  'All locations'
                                )
                              ) : (
                                /* For Staff/Manager - show specific location */
                                user.locationId ? getLocationsForFranchise(user.franchiseId).find(loc => loc.id === user.locationId)?.name || 'Unknown location' : 'Not assigned'
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
                          {user.role === 'superadmin' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </span>
                          ) : (user.role === 'admin' || user.role === 'owner') && !user.isApproved ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Approval
                            </span>
                          ) : user.isApproved ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Admin Approval
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="grid grid-cols-1 gap-2 min-w-[150px]">
                            {/* Status Toggle */}
                            <button
                              onClick={() => toggleUserStatus(user.uid, user.isActive)}
                              className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                user.isActive 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                              }`}
                            >
                              {user.isActive ? (
                                <><ToggleRight className="h-4 w-4 mr-1" />Active</>
                              ) : (
                                <><ToggleLeft className="h-4 w-4 mr-1" />Inactive</>
                              )}
                            </button>
                            
                            {/* Approval Actions for unapproved users (excluding superadmin) */}
                            {user.role !== 'superadmin' && !user.isApproved && (
                              <div className="grid grid-cols-2 gap-1">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => {
                                    if (user.role === 'staff' || user.role === 'manager') {
                                      const locationSelect = document.getElementById(`location-${user.uid}`) as HTMLSelectElement;
                                      const locationId = locationSelect?.value || undefined;
                                      if (!locationId) {
                                        alert('Please select a location for ' + user.role);
                                        return;
                                      }
                                      handleApproveWithLocation(user.uid, locationId);
                                    } else {
                                      // For Admin/Owner - approve without location selection
                                      handleApproveWithLocation(user.uid);
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
                                  onClick={() => handleRejectUser(user.uid)}
                                  className="text-xs px-2 py-1"
                                >
                                  <XCircle size={12} className="mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            
                            {/* Delete Action - Only for non-superadmin users */}
                            {user.role !== 'superadmin' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => deleteUser(user.uid)}
                                className="text-xs px-2 py-1 w-full"
                              >
                                <Trash2 size={12} className="mr-1" />
                                Delete
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

export default SuperAdminUsersPage;