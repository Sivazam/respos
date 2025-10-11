import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { Franchise, User, UserRole } from '../../types';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ErrorAlert from '../ui/ErrorAlert';
import { format } from 'date-fns';

interface FranchiseUserManagementProps {
  franchise: Franchise;
  onClose: () => void;
}

interface FranchiseUser extends User {
  franchiseId: string;
}

interface UserFormData {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
  phone?: string;
}

const FranchiseUserManagement: React.FC<FranchiseUserManagementProps> = ({
  franchise,
  onClose
}) => {
  const [users, setUsers] = useState<FranchiseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<FranchiseUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    role: 'franchise_staff',
    displayName: '',
    phone: ''
  });

  useEffect(() => {
    fetchFranchiseUsers();
  }, [franchise.id]);

  const fetchFranchiseUsers = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'users'),
        where('franchiseId', '==', franchise.id)
      );
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLogin: doc.data().lastLogin?.toDate() || new Date()
      })) as FranchiseUser[];
      
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error fetching franchise users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return;
    }

    try {
      setLoading(true);

      if (editingUser) {
        // Update existing user
        const userRef = doc(db, 'users', editingUser.uid);
        await updateDoc(userRef, {
          role: formData.role,
          displayName: formData.displayName,
          phone: formData.phone || null,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        // Add user document to Firestore using the Firebase Auth UID as the document ID
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          role: formData.role,
          displayName: formData.displayName,
          phone: formData.phone || null,
          franchiseId: franchise.id,
          isActive: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }

      await fetchFranchiseUsers();
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        role: 'franchise_staff',
        displayName: '',
        phone: ''
      });
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: FranchiseUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      role: user.role,
      displayName: user.displayName || '',
      phone: user.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (user: FranchiseUser) => {
    if (window.confirm(`Are you sure you want to delete user "${user.displayName || user.email}"?`)) {
      try {
        await deleteDoc(doc(db, 'users', user.uid));
        await fetchFranchiseUsers();
      } catch (err: any) {
        console.error('Error deleting user:', err);
        setError(err.message || 'Failed to delete user');
      }
    }
  };

  const handleToggleStatus = async (user: FranchiseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isActive: !user.isActive,
        updatedAt: serverTimestamp()
      });
      await fetchFranchiseUsers();
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError(err.message || 'Failed to update user status');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'franchise_manager':
        return 'bg-purple-100 text-purple-800';
      case 'franchise_staff':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'franchise_manager':
        return 'Manager';
      case 'franchise_staff':
        return 'Staff';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage users for {franchise.name}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              setFormData({
                email: '',
                password: '',
                role: 'franchise_staff',
                displayName: '',
                phone: ''
              });
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-1" />
            Add User
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                disabled={!!editingUser}
                required
              />
              
              {!editingUser && (
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
              )}
              
              <Input
                label="Display Name"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Enter full name"
                required
              />
              
              <Input
                label="Phone (Optional)"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full rounded-md border border-gray-300 py-2 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="franchise_staff">Franchise Staff</option>
                  <option value="franchise_manager">Franchise Manager</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
              >
                {editingUser ? 'Update' : 'Create'} User
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading && !showForm ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No users found for this franchise.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {users.map(user => (
              <div key={user.uid} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {user.displayName || 'No Name'}
                    </h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex space-x-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {user.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone size={14} className="mr-2" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-2" />
                    <span>Created: {format(user.createdAt, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar size={14} className="mr-2" />
                    <span>Last Login: {format(user.lastLogin, 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                    className="flex-1"
                  >
                    <Edit2 size={14} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={user.isActive ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => handleToggleStatus(user)}
                    className="flex-1"
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(user)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FranchiseUserManagement;