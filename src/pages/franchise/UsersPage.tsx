import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Users, UserPlus, Search, Edit, Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorAlert from '../../components/ui/ErrorAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useLocations } from '../../contexts/LocationContext';
import { User, UserRole } from '../../types';
import FranchiseUserForm from '../../components/franchise/FranchiseUserForm';

const FranchiseUsersPage: React.FC = () => {
  const { currentUser, approveUser } = useAuth();
  const { currentFranchise, franchises } = useFranchises();
  const { locations } = useLocations();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('');
  
  // Get the selected franchise object
  const selectedFranchise = franchises.find(f => f.id === selectedFranchiseId) || currentFranchise;

  useEffect(() => {
    // Initialize selected franchise ID when current franchise changes
    if (currentFranchise && !selectedFranchiseId) {
      setSelectedFranchiseId(currentFranchise.id);
    }
  }, [currentFranchise, selectedFranchiseId]);

  useEffect(() => {
    if (selectedFranchise) {
      fetchUsers();
    }
  }, [selectedFranchise]);

  const fetchUsers = async () => {
    if (!selectedFranchise) return;
    
    setLoading(true);
    try {
      console.log('Fetching users for franchise:', selectedFranchise.id, selectedFranchise.name);
      const q = query(
        collection(db, 'users'),
        where('franchiseId', '==', selectedFranchise.id)
      );
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      })) as User[];
      
      console.log('Found users for franchise:', usersData.map(u => ({ email: u.email, role: u.role, franchiseId: u.franchiseId })));
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!currentUser || !selectedFranchise) return;
    
    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      try {
        // Instead of deleting, just mark as inactive
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          isActive: false,
          updatedAt: serverTimestamp()
        });
        await fetchUsers();
      } catch (err: any) {
        console.error('Error deleting user:', err);
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  const handleApproveUser = async (user: User) => {
    if (!currentUser || !selectedFranchise) return;
    
    try {
      await approveUser(user.uid);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error approving user:', err);
      setError(err.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (user: User) => {
    if (!currentUser || !selectedFranchise) return;
    
    if (window.confirm(`Are you sure you want to reject ${user.email}? This will delete their account.`)) {
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

  const toggleUserStatus = async (user: User) => {
    if (!currentUser || !selectedFranchise) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        isActive: !user.isActive,
        updatedAt: serverTimestamp()
      });
      await fetchUsers();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!selectedFranchise) return;
    
    try {
      if (editingUser) {
        // Update existing user
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, {
          role: formData.role,
          locationId: formData.locationId || null,
          isActive: formData.isActive,
          updatedAt: serverTimestamp()
        });
      } else {
        // For new users, we'll use the register function from AuthContext
        // This will be handled by the FranchiseUserForm component
      }
      
      setShowForm(false);
      await fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-green-100 text-green-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalStatusBadge = (user: User) => {
    if (!user.isApproved) {
      return (
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-yellow-500 mr-1" />
          <span className="text-sm text-yellow-700">Pending Approval</span>
        </div>
      );
    }
    
    if (!user.isActive) {
      return (
        <div className="flex items-center">
          <ToggleLeft className="h-5 w-5 text-red-500 mr-1" />
          <span className="text-sm text-red-700">Inactive</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center">
        <ToggleRight className="h-5 w-5 text-green-500 mr-1" />
        <span className="text-sm text-green-700">Active</span>
      </div>
    );
  };

  const getLocationName = (user: User) => {
    if (user.role === 'admin' || user.role === 'owner') {
      /* For Admin/Owner - show count of locations or all locations */
      return user.locationIds && user.locationIds.length > 0 ? (
        `${user.locationIds.length} location(s)`
      ) : (
        'All locations'
      );
    } else {
      /* For Staff/Manager - show specific location */
      if (!user.locationId) return 'Not assigned';
      const location = locations.find(loc => loc.id === user.locationId);
      return location ? location.name : 'Unknown location';
    }
  };

  const getTimeAgo = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800">Debug Info:</h3>
            <p className="text-sm text-blue-700">
              Selected Franchise ID: {selectedFranchise?.id || 'None'}<br/>
              Selected Franchise Name: {selectedFranchise?.name || 'None'}<br/>
              Current Franchise ID: {currentFranchise?.id || 'None'}<br/>
              Total Users Found: {users.length}
            </p>
          </div>
        )}
        
        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">Manage users across your franchise locations</p>
          </div>
          <Button 
            variant="primary"
            onClick={handleAddUser}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Franchise Selector */}
        {franchises.length > 1 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Franchise:
            </label>
            <select
              value={selectedFranchiseId}
              onChange={(e) => setSelectedFranchiseId(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {franchises.map(franchise => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name} ({franchise.id})
                </option>
              ))}
            </select>
          </div>
        )}

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

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="text-gray-400 w-4 h-4" />}
              />
            </div>
          </div>
        </div>

        {/* User Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                
                <FranchiseUserForm 
                  onSubmit={handleFormSubmit}
                  onCancel={() => setShowForm(false)}
                  initialData={editingUser}
                  locations={locations}
                  franchiseId={selectedFranchise?.id}
                />
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Franchise Users
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
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
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || 'No name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLocationName(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getApprovalStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTimeAgo(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!user.isApproved ? (
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleApproveUser(user)}
                              className="text-green-600 hover:text-green-900"
                              title="Approve User"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleRejectUser(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Reject User"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => toggleUserStatus(user)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title={user.isActive ? "Deactivate" : "Activate"}
                            >
                              {user.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first user to the franchise.</p>
            <Button 
              variant="primary"
              onClick={handleAddUser}
              className="flex items-center gap-2 mx-auto"
            >
              <UserPlus className="w-4 h-4" />
              Add First User
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FranchiseUsersPage;