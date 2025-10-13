import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/db';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { useTables } from './TableContext';
import { Order, OrderItem, OrderFormData, OrderStatus, OfflineOrderAction } from '../types';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (orderData: OrderFormData) => Promise<string>;
  updateOrder: (orderId: string, orderData: Partial<Order>) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByTable: (tableId: string) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addItemToOrder: (orderId: string, item: OrderItem) => Promise<void>;
  removeItemFromOrder: (orderId: string, itemId: string) => Promise<void>;
  updateItemQuantity: (orderId: string, itemId: string, quantity: number) => Promise<void>;
  calculateOrderTotal: (order: Order) => number;
  applyDiscount: (orderId: string, discount: { type: 'percentage' | 'fixed'; amount: number; reason?: string }) => Promise<void>;
  applyTax: (orderId: string, taxRate: number) => Promise<void>;
  processPayment: (orderId: string, paymentData: any) => Promise<void>;
  refreshOrders: () => Promise<void>;
  // Offline support
  syncOfflineActions: () => Promise<void>;
  addOfflineAction: (action: OfflineOrderAction) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: React.ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();

  // Local storage key for offline actions
  const OFFLINE_STORAGE_KEY = 'restaurant_offline_order_actions';

  // Load offline actions from localStorage
  const getOfflineActions = (): OfflineOrderAction[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading offline actions:', error);
      return [];
    }
  };

  // Save offline actions to localStorage
  const saveOfflineActions = (actions: OfflineOrderAction[]) => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  };

  // Add offline action
  const addOfflineAction = useCallback((action: OfflineOrderAction) => {
    const actions = getOfflineActions();
    actions.push(action);
    saveOfflineActions(actions);
  }, []);

  // Sync offline actions
  const syncOfflineActions = useCallback(async () => {
    if (!currentUser || !currentLocation) return;

    const actions = getOfflineActions();
    const unsyncedActions = actions.filter(action => !action.isSynced);

    if (unsyncedActions.length === 0) return;

    try {
      const batch = writeBatch(db);
      const syncedActionIds: string[] = [];

      for (const action of unsyncedActions) {
        const orderRef = doc(db, 'orders', action.orderId);

        switch (action.action) {
          case 'create':
            batch.set(orderRef, {
              ...action.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'update':
            batch.update(orderRef, {
              ...action.data,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'delete':
            batch.delete(orderRef);
            break;

          case 'addItem':
            batch.update(orderRef, {
              items: [...(action.data.currentItems || []), action.data.item],
              updatedAt: serverTimestamp(),
            });
            break;

          case 'removeItem':
            const updatedItems = (action.data.currentItems || []).filter(
              (item: OrderItem) => item.id !== action.data.itemId
            );
            batch.update(orderRef, {
              items: updatedItems,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'updateStatus':
            batch.update(orderRef, {
              status: action.data.status,
              statusHistory: [...(action.data.statusHistory || []), {
                status: action.data.status,
                timestamp: serverTimestamp(),
                updatedBy: action.staffId,
                note: action.data.note,
              }],
              updatedAt: serverTimestamp(),
            });
            break;
        }

        syncedActionIds.push(action.id);
      }

      await batch.commit();

      // Mark actions as synced
      const updatedActions = actions.map(action =>
        syncedActionIds.includes(action.id)
          ? { ...action, isSynced: true, syncedAt: new Date() }
          : action
      );
      saveOfflineActions(updatedActions);

    } catch (error) {
      console.error('Error syncing offline actions:', error);
      setError('Failed to sync offline actions');
    }
  }, [currentUser?.uid, currentLocation?.id]);

  // Fetch orders for current location
  const fetchOrders = useCallback(async () => {
    if (!currentLocation) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simplified query to avoid index requirements - fetch all orders for location
      const ordersQuery = query(
        collection(db, 'orders'),
        where('locationId', '==', currentLocation.id)
      );

      const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Include all orders for operational use (staff dashboard needs to see pending/preparing orders)
          ordersData.push({
            id: doc.id,
            orderNumber: data.orderNumber,
            tableId: data.tableId,
            tableIds: data.tableIds || [],
            tableNames: data.tableNames || [],
            locationId: data.locationId,
            staffId: data.staffId,
            staffName: data.staffName,
            items: data.items || [],
            status: data.status,
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            discount: data.discount || { type: 'percentage', amount: 0 },
            total: data.total || 0,
            paymentStatus: data.paymentStatus || 'pending',
            paymentMethod: data.paymentMethod,
            paymentDetails: data.paymentDetails,
            orderType: data.orderType || 'dine-in',
            customerInfo: data.customerInfo,
            specialInstructions: data.specialInstructions,
            estimatedTime: data.estimatedTime?.toDate(),
            completedAt: data.completedAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            statusHistory: data.statusHistory || [],
          });
        });
        // Sort client-side by createdAt
        ordersData.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        setOrders(ordersData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching orders:', error);
        setError('Failed to fetch orders');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up orders listener:', error);
      setError('Failed to setup orders listener');
      setLoading(false);
    }
  }, [currentLocation]);

  // Initialize orders listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (currentLocation) {
      fetchOrders().then((unsub) => {
        unsubscribe = unsub;
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchOrders, currentLocation]);

  // Auto-sync offline actions when online
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineActions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineActions]);

  // Generate order number
  const generateOrderNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${year}${month}${day}-${random}`;
  }, []);

  // Create new order
  const createOrder = useCallback(async (orderData: OrderFormData): Promise<string> => {
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    try {
      const orderNumber = generateOrderNumber();
      const newOrder = {
        orderNumber,
        tableId: orderData.tableId || (orderData.tableIds && orderData.tableIds.length > 0 ? orderData.tableIds[0] : null),
        tableIds: orderData.tableIds || [],
        tableNames: orderData.tableNames || [],
        locationId: currentLocation.id,
        staffId: currentUser.uid,
        staffName: currentUser.displayName || 'Unknown Staff',
        items: orderData.items || [],
        status: orderData.status || 'pending' as OrderStatus,
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        discount: orderData.discount || { type: 'percentage' as const, amount: 0 },
        total: orderData.total || 0,
        totalAmount: orderData.totalAmount || 0,
        gstAmount: orderData.gstAmount || 0,
        paymentStatus: orderData.paymentStatus || 'pending' as const,
        paymentMethod: orderData.paymentMethod,
        settledAt: orderData.settledAt || null,
        orderType: orderData.orderType || 'dinein',
        customerName: orderData.customerName || null,
        customerPhone: orderData.customerPhone || null,
        deliveryAddress: orderData.deliveryAddress || null,
        notes: orderData.notes || null,
        specialInstructions: orderData.specialInstructions || null,
        estimatedTime: orderData.estimatedTime ? new Date(orderData.estimatedTime) : null,
        completedAt: orderData.completedAt || null,
        statusHistory: [{
          status: 'pending' as OrderStatus,
          timestamp: new Date(),
          updatedBy: currentUser.uid,
          note: 'Order created',
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (navigator.onLine) {
        const docRef = await addDoc(collection(db, 'orders'), newOrder);
        return docRef.id;
      } else {
        // Add to offline actions
        const orderId = `temp_${Date.now()}`;
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'create',
          data: newOrder,
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
        return orderId;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }, [currentUser, currentLocation, generateOrderNumber, addOfflineAction]);

  // Update order
  const updateOrder = useCallback(async (orderId: string, orderData: Partial<Order>) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const updateData = {
        ...orderData,
        updatedAt: serverTimestamp(),
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'orders', orderId), updateData);
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'update',
          data: updateData,
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Delete order
  const deleteOrder = useCallback(async (orderId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      if (navigator.onLine) {
        await deleteDoc(doc(db, 'orders', orderId));
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'delete',
          data: {},
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Get order by ID
  const getOrderById = useCallback((orderId: string): Order | undefined => {
    return orders.find(order => order.id === orderId);
  }, [orders]);

  // Get orders by table
  const getOrdersByTable = useCallback((tableId: string): Order[] => {
    return orders.filter(order => order.tableId === tableId);
  }, [orders]);

  // Get orders by status
  const getOrdersByStatus = useCallback((status: OrderStatus): Order[] => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  // Update order status
  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, note?: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const statusUpdate = {
        status,
        statusHistory: [
          ...order.statusHistory,
          {
            status,
            timestamp: serverTimestamp(),
            updatedBy: currentUser.uid,
            note: note || `Status updated to ${status}`,
          },
        ],
        ...(status === 'completed' && { completedAt: serverTimestamp() }),
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'orders', orderId), {
          ...statusUpdate,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'updateStatus',
          data: {
            ...statusUpdate,
            currentItems: order.items,
          },
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }, [currentUser, getOrderById, addOfflineAction]);

  // Add item to order
  const addItemToOrder = useCallback(async (orderId: string, item: OrderItem) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = [...order.items, item];

      if (navigator.onLine) {
        await updateDoc(doc(db, 'orders', orderId), {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'addItem',
          data: {
            item,
            currentItems: order.items,
          },
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  }, [currentUser, getOrderById, addOfflineAction]);

  // Remove item from order
  const removeItemFromOrder = useCallback(async (orderId: string, itemId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = order.items.filter(item => item.id !== itemId);

      if (navigator.onLine) {
        await updateDoc(doc(db, 'orders', orderId), {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'removeItem',
          data: {
            itemId,
            currentItems: order.items,
          },
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error removing item from order:', error);
      throw error;
    }
  }, [currentUser, getOrderById, addOfflineAction]);

  // Update item quantity
  const updateItemQuantity = useCallback(async (orderId: string, itemId: string, quantity: number) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const updatedItems = order.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );

      if (navigator.onLine) {
        await updateDoc(doc(db, 'orders', orderId), {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Add to offline actions
        const offlineAction: OfflineOrderAction = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          action: 'update',
          data: {
            items: updatedItems,
          },
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error updating item quantity:', error);
      throw error;
    }
  }, [currentUser, getOrderById, addOfflineAction]);

  // Calculate order total
  const calculateOrderTotal = useCallback((order: Order): number => {
    const subtotal = order.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    let discountAmount = 0;
    if (order.discount.type === 'percentage') {
      discountAmount = subtotal * (order.discount.amount / 100);
    } else {
      discountAmount = order.discount.amount;
    }

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (order.tax / 100);
    
    return afterDiscount + taxAmount;
  }, []);

  // Apply discount
  const applyDiscount = useCallback(async (orderId: string, discount: { type: 'percentage' | 'fixed'; amount: number; reason?: string }) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const subtotal = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      let discountAmount = 0;
      
      if (discount.type === 'percentage') {
        discountAmount = subtotal * (discount.amount / 100);
      } else {
        discountAmount = discount.amount;
      }

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (order.tax / 100);
      const total = afterDiscount + taxAmount;

      await updateOrder(orderId, {
        discount,
        subtotal,
        total,
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      throw error;
    }
  }, [currentUser, getOrderById, updateOrder]);

  // Apply tax
  const applyTax = useCallback(async (orderId: string, taxRate: number) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const order = getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const subtotal = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      let discountAmount = 0;
      
      if (order.discount.type === 'percentage') {
        discountAmount = subtotal * (order.discount.amount / 100);
      } else {
        discountAmount = order.discount.amount;
      }

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;

      await updateOrder(orderId, {
        tax: taxRate,
        subtotal,
        total,
      });
    } catch (error) {
      console.error('Error applying tax:', error);
      throw error;
    }
  }, [currentUser, getOrderById, updateOrder]);

  // Process payment
  const processPayment = useCallback(async (orderId: string, paymentData: any) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      await updateOrder(orderId, {
        paymentStatus: 'paid',
        paymentMethod: paymentData.method,
        paymentDetails: paymentData,
        updatedAt: serverTimestamp(),
      });

      await updateOrderStatus(orderId, 'completed', 'Payment processed');
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }, [currentUser, updateOrder, updateOrderStatus]);

  // Refresh orders
  const refreshOrders = useCallback(async () => {
    await fetchOrders();
  }, [fetchOrders]);

  const value: OrderContextType = {
    orders,
    loading,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    getOrdersByTable,
    getOrdersByStatus,
    updateOrderStatus,
    addItemToOrder,
    removeItemFromOrder,
    updateItemQuantity,
    calculateOrderTotal,
    applyDiscount,
    applyTax,
    processPayment,
    refreshOrders,
    syncOfflineActions,
    addOfflineAction,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};