import React from 'react';
import { useTemporaryOrdersDisplay } from '../contexts/TemporaryOrdersDisplayContext';
import { useAuth } from '../contexts/AuthContext';

const DebugTemporaryOrders: React.FC = () => {
  const { temporaryOrders, loading, error } = useTemporaryOrdersDisplay();
  const { currentUser } = useAuth();

  console.log('🔍 Debug Temporary Orders:', {
    currentUser: currentUser?.uid,
    currentUserRole: currentUser?.role,
    temporaryOrdersCount: temporaryOrders.length,
    temporaryOrders: temporaryOrders,
    loading,
    error
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Debug Temporary Orders</h2>
      <div>
        <strong>Current User:</strong> {currentUser?.uid} ({currentUser?.role})
      </div>
      <div>
        <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Error:</strong> {error || 'None'}
      </div>
      <div>
        <strong>Temporary Orders Count:</strong> {temporaryOrders.length}
      </div>
      <div>
        <strong>Orders:</strong>
        <ul>
          {temporaryOrders.map(order => (
            <li key={order.id}>
              {order.orderNumber} - {order.status} - {order.items?.length || 0} items
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DebugTemporaryOrders;