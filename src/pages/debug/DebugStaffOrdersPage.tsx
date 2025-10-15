import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService } from '../../services/orderService';

const DebugStaffOrdersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempOrders, setTempOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser?.uid || !currentUser?.locationId) {
      setError('User not authenticated or no location assigned');
      setLoading(false);
      return;
    }

    const orderService = OrderService.getInstance();
    setLoading(true);

    // Subscribe to staff temporary orders
    const unsubscribe = orderService.subscribeToStaffTemporaryOrders(
      currentUser.uid,
      currentUser.locationId,
      (fetchedOrders) => {
        console.log('🔍 Debug - Fetched orders:', fetchedOrders);
        setOrders(fetchedOrders);
        setLoading(false);
      }
    );

    // Also fetch temporary orders directly for comparison
    const fetchTempOrders = async () => {
      try {
        const tempOrdersData = await orderService.getStaffTemporaryOrders(
          currentUser.uid,
          currentUser.locationId
        );
        console.log('🔍 Debug - Direct temp orders:', tempOrdersData);
        setTempOrders(tempOrdersData);
      } catch (err) {
        console.error('Error fetching temp orders directly:', err);
      }
    };

    fetchTempOrders();

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="border rounded-lg p-6">
          <p className="text-center text-gray-500">Please log in to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug Staff Orders</h1>
        <div className="text-sm text-gray-500">
          User: {currentUser.email} | Location: {currentUser.locationId}
        </div>
      </div>

      {/* Debug Info */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <div className="space-y-2">
          <div>
            <strong>User ID:</strong> {currentUser.uid}
          </div>
          <div>
            <strong>Location ID:</strong> {currentUser.locationId}
          </div>
          <div>
            <strong>Orders from subscribeToStaffTemporaryOrders:</strong> {orders.length}
          </div>
          <div>
            <strong>Orders from direct fetch:</strong> {tempOrders.length}
          </div>
          <div className="border-t my-4"></div>
          <div>
            <strong>Console Logs:</strong> Check browser console for detailed debug information
          </div>
        </div>
      </div>

      {/* Orders from Subscription */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Orders from Real-time Subscription ({orders.length})
        </h2>
        {loading ? (
          <p>Loading orders...</p>
        ) : error ? (
          <p className="text-red-500">Error: {error}</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">No temporary orders found.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                    order.status === 'temporary' 
                      ? 'bg-purple-100 text-purple-800 border-purple-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <div>Table: {order.tableNames?.join(', ') || 'N/A'}</div>
                  <div>Created: {order.createdAt ? formatDate(order.createdAt) : 'N/A'}</div>
                  <div>Items: {order.items?.length || 0}</div>
                  <div>Subtotal: {formatCurrency(order.subtotal || 0)}</div>
                  <div>Total: {formatCurrency(order.totalAmount || 0)}</div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="mt-2">
                    <strong>Items:</strong>
                    <ul className="text-sm text-gray-500 ml-4">
                      {order.items.map((item: any, index: number) => (
                        <li key={index}>
                          {item.name} x {item.quantity} = {formatCurrency(item.price * item.quantity)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Temp Orders */}
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Direct Temporary Orders Query ({tempOrders.length})
        </h2>
        {tempOrders.length === 0 ? (
          <p className="text-gray-500">No temporary orders found.</p>
        ) : (
          <div className="space-y-4">
            {tempOrders.map((tempOrder) => (
              <div key={tempOrder.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Temp Order ID: {tempOrder.orderId}</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full border border-gray-300">
                    {tempOrder.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <div>Staff: {tempOrder.staffName}</div>
                  <div>Location: {tempOrder.locationName}</div>
                  <div>Created: {tempOrder.createdAt ? formatDate(tempOrder.createdAt) : 'N/A'}</div>
                  <div>Last Activity: {tempOrder.lastActivityAt ? formatDate(tempOrder.lastActivityAt) : 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugStaffOrdersPage;