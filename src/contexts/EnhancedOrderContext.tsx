import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { useTables } from './TableContext';
import { orderService } from '../services/orderService';
import { Order, TemporaryOrder, OrderFormData, OrderItem } from '../types';

interface EnhancedOrderContextType {
  // Staff Order Management
  temporaryOrders: TemporaryOrder[];
  createTemporaryOrder: (orderData: OrderFormData) => Promise<string>;
  updateOrderItems: (orderId: string, items: OrderItem[]) => Promise<void>;
  transferOrderToManager: (orderId: string, notes?: string) => Promise<void>;
  
  // Manager Order Management
  managerPendingOrders: any[];
  acceptPendingOrder: (pendingOrderId: string) => Promise<void>;
  settleOrder: (orderId: string, paymentData: any) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  updateOrder: (orderId: string, updatedOrder: any) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  
  // Shared Order Management
  allOrders: Order[];
  getOrderById: (orderId: string) => Order | undefined;
  refreshOrders: () => void;
  
  // Loading states
  loading: boolean;
  error: string | null;
}

const EnhancedOrderContext = createContext<EnhancedOrderContextType | undefined>(undefined);

export const useEnhancedOrders = () => {
  const context = useContext(EnhancedOrderContext);
  if (!context) {
    throw new Error('useEnhancedOrders must be used within an EnhancedOrderProvider');
  }
  return context;
};

interface EnhancedOrderProviderProps {
  children: React.ReactNode;
}

export const EnhancedOrderProvider: React.FC<EnhancedOrderProviderProps> = ({ children }) => {
  const [temporaryOrders, setTemporaryOrders] = useState<TemporaryOrder[]>([]);
  const [managerPendingOrders, setManagerPendingOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const { tables } = useTables();

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Subscribe to all orders for current location
  useEffect(() => {
    if (!currentLocation) {
      setAllOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = orderService.subscribeToLocationOrders(
        currentLocation.id,
        (orders) => {
          setAllOrders(orders);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up orders listener:', err);
      setError('Failed to load orders');
      setLoading(false);
    }
  }, [currentLocation]);

  // Subscribe to staff temporary orders
  useEffect(() => {
    if (!currentUser || !currentLocation || currentUser.role !== 'staff') {
      setTemporaryOrders([]);
      return;
    }

    try {
      const unsubscribe = orderService.subscribeToStaffTemporaryOrders(
        currentUser.uid,
        currentLocation.id,
        (orders) => {
          setTemporaryOrders(orders);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up temporary orders listener:', err);
      setError('Failed to load temporary orders');
    }
  }, [currentUser?.uid, currentUser?.role, currentLocation?.id]);

  // Subscribe to manager pending orders
  useEffect(() => {
    if (!currentUser || !currentLocation || !['admin', 'owner', 'manager'].includes(currentUser.role)) {
      setManagerPendingOrders([]);
      return;
    }

    try {
      const unsubscribe = orderService.subscribeToManagerPendingOrders(
        currentLocation.id,
        (orders) => {
          console.log('📥 EnhancedOrderContext received orders:', orders.length, orders);
          setManagerPendingOrders(orders);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up manager pending orders listener:', err);
      setError('Failed to load manager pending orders');
    }
  }, [currentUser?.uid, currentUser?.role, currentLocation?.id]);

  // Create temporary order
  const createTemporaryOrder = useCallback(async (orderData: OrderFormData): Promise<string> => {
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    clearError();

    try {
      console.log('🚀 Creating temporary order:', orderData);
      
      const orderId = await orderService.createTemporaryOrder(
        orderData,
        currentUser,
        currentLocation.id,
        currentUser.franchiseId || ''
      );

      console.log('✅ Temporary order created successfully:', orderId);
      return orderId;
    } catch (err: any) {
      console.error('Error creating temporary order:', err);
      const errorMessage = err.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, currentLocation, clearError]);

  // Update order items
  const updateOrderItems = useCallback(async (orderId: string, items: OrderItem[]): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('🔄 Updating order items:', { orderId, itemsCount: items.length });
      
      await orderService.updateOrderItems(orderId, items, currentUser.uid);
      
      console.log('✅ Order items updated successfully');
    } catch (err: any) {
      console.error('Error updating order items:', err);
      const errorMessage = err.message || 'Failed to update order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Transfer order to manager
  const transferOrderToManager = useCallback(async (orderId: string, notes?: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('📤 Transferring order to manager:', { orderId, notes });
      
      await orderService.transferOrderToManager(orderId, currentUser.uid, notes);
      
      console.log('✅ Order transferred to manager successfully');
    } catch (err: any) {
      console.error('Error transferring order to manager:', err);
      const errorMessage = err.message || 'Failed to transfer order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Accept pending order (Manager)
  const acceptPendingOrder = useCallback(async (pendingOrderId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('✅ Accepting pending order:', pendingOrderId);
      
      await orderService.acceptPendingOrder(pendingOrderId, currentUser.uid);
      
      console.log('✅ Pending order accepted successfully');
    } catch (err: any) {
      console.error('Error accepting pending order:', err);
      const errorMessage = err.message || 'Failed to accept order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Settle order (Manager)
  const settleOrder = useCallback(async (orderId: string, paymentData: any): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('💰 Settling order:', { orderId, paymentData });
      
      await orderService.settleOrder(orderId, paymentData, currentUser.uid);
      
      console.log('✅ Order settled successfully');
    } catch (err: any) {
      console.error('Error settling order:', err);
      const errorMessage = err.message || 'Failed to settle order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Complete order
  const completeOrder = useCallback(async (orderId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('🎉 Completing order:', orderId);
      
      await orderService.completeOrder(orderId, currentUser.uid);
      
      console.log('✅ Order completed successfully');
    } catch (err: any) {
      console.error('Error completing order:', err);
      const errorMessage = err.message || 'Failed to complete order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Update order (Manager)
  const updateOrder = useCallback(async (orderId: string, updatedOrder: any): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('🔄 Updating order:', { orderId, updatedOrder });
      
      await orderService.updateOrder(orderId, updatedOrder, currentUser.uid);
      
      console.log('✅ Order updated successfully');
    } catch (err: any) {
      console.error('Error updating order:', err);
      const errorMessage = err.message || 'Failed to update order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Delete order (Manager)
  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      console.log('🗑️ Deleting order:', orderId);
      
      await orderService.deleteOrder(orderId, currentUser.uid);
      
      console.log('✅ Order deleted successfully');
    } catch (err: any) {
      console.error('Error deleting order:', err);
      const errorMessage = err.message || 'Failed to delete order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Get order by ID
  const getOrderById = useCallback((orderId: string): Order | undefined => {
    return allOrders.find(order => order.id === orderId);
  }, [allOrders]);

  // Refresh orders
  const refreshOrders = useCallback(() => {
    // The real-time listeners will automatically refresh
    console.log('🔄 Orders refresh triggered');
  }, []);

  // Context value
  const value: EnhancedOrderContextType = {
    // Staff Order Management
    temporaryOrders,
    createTemporaryOrder,
    updateOrderItems,
    transferOrderToManager,
    
    // Manager Order Management
    managerPendingOrders,
    acceptPendingOrder,
    settleOrder,
    completeOrder,
    updateOrder,
    deleteOrder,
    
    // Shared Order Management
    allOrders,
    getOrderById,
    refreshOrders,
    
    // Loading states
    loading,
    error
  };

  return (
    <EnhancedOrderContext.Provider value={value}>
      {children}
    </EnhancedOrderContext.Provider>
  );
};