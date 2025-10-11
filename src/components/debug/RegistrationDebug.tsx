import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

const RegistrationDebug: React.FC = () => {
  const { register } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      }));
      
      setUsers(usersData);
      setTestResult(`Found ${usersData.length} users`);
    } catch (error: any) {
      setTestResult(`Error fetching users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegistration = async () => {
    try {
      setLoading(true);
      setTestResult('Testing registration...');
      
      const testEmail = `test${Date.now()}@example.com`;
      await register(testEmail, 'password123', 'admin');
      
      setTestResult(`✅ Successfully registered ${testEmail}`);
      fetchUsers(); // Refresh the user list
    } catch (error: any) {
      setTestResult(`❌ Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectFirestore = async () => {
    try {
      setLoading(true);
      setTestResult('Testing direct Firestore write...');
      
      const testDoc = {
        email: `direct${Date.now()}@example.com`,
        displayName: 'Direct Test',
        role: 'admin',
        isActive: false,
        isApproved: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'users'), testDoc);
      setTestResult(`✅ Direct Firestore write successful: ${docRef.id}`);
      fetchUsers(); // Refresh the user list
    } catch (error: any) {
      setTestResult(`❌ Direct Firestore write failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Registration Debug</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Users'}
        </button>
        
        <button
          onClick={testRegistration}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test Registration'}
        </button>
        
        <button
          onClick={testDirectFirestore}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test Direct Firestore'}
        </button>
      </div>
      
      {testResult && (
        <div className="p-4 bg-gray-100 rounded mb-4">
          <strong>Result:</strong> {testResult}
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Users in Firestore ({users.length})</h3>
        {users.length === 0 ? (
          <p className="text-gray-500">No users found</p>
        ) : (
          <div className="space-y-2">
            {users.map(user => (
              <div key={user.id} className="p-3 border rounded bg-gray-50">
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Role:</strong> {user.role}</div>
                <div><strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}</div>
                <div><strong>Approved:</strong> {user.isApproved ? 'Yes' : 'No'}</div>
                <div><strong>Created:</strong> {user.createdAt?.toLocaleString()}</div>
                <div><strong>Franchise:</strong> {user.franchiseId || 'None'}</div>
                <div><strong>Location:</strong> {user.locationId || 'None'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationDebug;