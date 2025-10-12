import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { useTables } from './TableContext';
import { OrderItem, TemporaryOrder } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { orderService } from '../services/orderService';

interface ManagerOrderContextType {
  managerOrder: TemporaryOrder | null;
  isManagerOrderActive: boolean;
  startManagerOrder: (tableIds: string[], orderType: 'dinein' | 'delivery', orderMode?: 'zomato' | 'swiggy' | 'in-store') => void;
  addItemToManagerOrder: (item: OrderItem) => void;
  removeItemFromManagerOrder: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearManagerOrder: () => void;
  clearCurrentManagerOrder: () => void;
  setManagerOrder: (order: TemporaryOrder) => void;
  saveManagerOrder: () => void;
  loadManagerOrder: (orderId: string) => Promise<TemporaryOrder>;
  createPartialManagerOrder: () => Promise<void>;
  checkForExistingManagerOrder: (tableIds: string[]) => Promise<TemporaryOrder | null>;
  calculateTotals: () => { subtotal: number; gst: number; total: number; cgstAmount: number; sgstAmount: number };
  getTableNames: () => string[];
  loadFromLocalStorage: () => TemporaryOrder | null;
  updateOrderMode: (orderMode: 'zomato' | 'swiggy' | 'in-store') => void;
  loadOrderIntoCart: (orderId: string) => Promise<TemporaryOrder>;
  settleManagerOrder: (paymentMethod: string) => Promise<void>;
}

const ManagerOrderContext = createContext<ManagerOrderContextType | undefined>(undefined);

export const useManagerOrder = () => {
  const context = useContext(ManagerOrderContext);
  if (context === undefined) {
    throw new Error('useManagerOrder must be used within a ManagerOrderProvider');
  }
  return context;
};

interface ManagerOrderProviderProps {
  children: React.ReactNode;
}

export const ManagerOrderProvider: React.FC<ManagerOrderProviderProps> = ({ children }) => {
  const [managerOrder, setManagerOrder] = useState<TemporaryOrder | null>(null);
  const [gstRates, setGstRates] = useState({ cgst: 0, sgst: 0 });
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const { tables, occupyTable, releaseTable } = useTables();

  // Local storage key for manager orders
  const getManagerOrderStorageKey = useCallback((orderId?: string) => {
    const baseKey = 'manager_pending_order';
    return orderId ? `${baseKey}_${orderId}` : baseKey;
  }, []);

  // Load GST settings from location
  useEffect(() => {
    const loadGstSettings = async () => {
      const locationId = currentLocation?.id || currentUser?.locationId;
      if (locationId) {
        try {
          const settingsDoc = await getDoc(doc(db, 'locationSettings', locationId));
          if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            const cgst = settings.tax?.cgst ?? 2.5;
            const sgst = settings.tax?.sgst ?? 2.5;
            setGstRates({ cgst, sgst });
            console.log('Loaded GST settings for manager orders:', { cgst, sgst });
          }
        } catch (error) {
          console.error('Error loading GST settings for manager orders:', error);
        }
      }
    };
    
    loadGstSettings();
  }, [currentLocation, currentUser]);

  // Calculate order totals
  const calculateOrderTotals = useCallback((items: OrderItem[]) => {
    const subtotal = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const cgstAmount = subtotal * (gstRates.cgst / 100);
    const sgstAmount = subtotal * (gstRates.sgst / 100);
    const totalGst = cgstAmount + sgstAmount;
    const total = subtotal + totalGst;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      gstAmount: Math.round(totalGst * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [gstRates]);

  // Save manager order to localStorage with manager_pending_ prefix
  const saveToLocalStorage = useCallback((order: TemporaryOrder) => {
    try {
      const key = getManagerOrderStorageKey(order.id);
      localStorage.setItem(key, JSON.stringify({
        ...order,
        createdAt: order.createdAt.toISOString(),
        sessionStartedAt: order.sessionStartedAt.toISOString(),
      }));
      console.log(`💾 Saved manager order to localStorage with key: ${key}`);
    } catch (error) {
      console.error('Error saving manager order to localStorage:', error);
    }
  }, [getManagerOrderStorageKey]);

  // Load manager order from localStorage
  const loadFromLocalStorage = useCallback((): TemporaryOrder | null => {
    try {
      // First try to load the main manager order
      const mainKey = getManagerOrderStorageKey();
      let stored = localStorage.getItem(mainKey);
      
      if (!stored) {
        // If no main order, try to find any manager_pending_ order
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('manager_pending_') && key !== mainKey) {
            stored = localStorage.getItem(key);
            if (stored) break;
          }
        }
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          sessionStartedAt: new Date(parsed.sessionStartedAt),
        };
      }
    } catch (error) {
      console.error('Error loading manager order from localStorage:', error);
    }
    return null;
  }, [getManagerOrderStorageKey]);

  // Auto-save to localStorage when order changes
  useEffect(() => {
    if (managerOrder) {
      saveToLocalStorage(managerOrder);
    }
  }, [managerOrder, saveToLocalStorage]);

  // Load manager order on mount
  useEffect(() => {
    const savedOrder = loadFromLocalStorage();
    if (savedOrder && savedOrder.locationId === currentLocation?.id) {
      setManagerOrder(savedOrder);
    }
  }, [currentLocation, loadFromLocalStorage]);

  // Clear current manager order from state and localStorage
  const clearCurrentManagerOrder = useCallback(() => {
    console.log('🧹 Clearing current manager order...');
    
    // Clear the state
    setManagerOrder(null);
    
    // Clear all manager order localStorage keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('manager_pending_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log(`🗑️ Removing manager order localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log('✅ Manager order cleared successfully');
  }, []);

  // Start a new manager order
  const startManagerOrder = useCallback(async (tableIds: string[], orderType: 'dinein' | 'delivery', orderMode: 'zomato' | 'swiggy' | 'in-store' = 'in-store') => {
    console.log('🆕 Starting new manager order with:', { tableIds, orderType, orderMode });
    
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    // Clear any existing manager order first
    console.log('🧹 Clearing existing manager order before starting new one');
    clearCurrentManagerOrder();

    const now = new Date();
    const orderId = `mgr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newOrder: TemporaryOrder = {
      id: orderId,
      locationId: currentLocation.id,
      tableIds,
      staffId: currentUser.uid,
      orderType,
      orderNumber: `MGR-${Date.now().toString().slice(-6)}`,
      items: [],
      status: 'temporary',
      subtotal: 0,
      gstAmount: 0,
      totalAmount: 0,
      isFinalOrder: false,
      sessionStartedAt: now,
      createdAt: now,
      updatedAt: now,
      orderMode: orderType === 'delivery' ? orderMode : 'in-store',
    };

    console.log('✅ Created new manager order:', newOrder);
    setManagerOrder(newOrder);
    
    // Update table status to occupied and store the order ID
    if (orderType === 'dinein') {
      for (const tableId of tableIds) {
        try {
          await occupyTable(tableId, newOrder.id);
        } catch (error) {
          console.log(`Table ${tableId} occupation handled by order service`);
        }
      }
    }
  }, [currentUser, currentLocation, occupyTable, clearCurrentManagerOrder]);

  // Add item to manager order
  const addItemToManagerOrder = useCallback((item: OrderItem) => {
    if (!managerOrder) return;

    // If this is the first item, update sessionStartedAt to now
    const isFirstItem = managerOrder.items.length === 0;
    const now = new Date();

    // Check if an identical item already exists
    const existingItemIndex = managerOrder.items.findIndex(existingItem =>
      existingItem.menuItemId === item.menuItemId &&
      JSON.stringify(existingItem.modifications) === JSON.stringify(item.modifications) &&
      existingItem.notes === item.notes
    );

    let updatedItems: OrderItem[];
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      updatedItems = managerOrder.items.map((existingItem, index) =>
        index === existingItemIndex
          ? { ...existingItem, quantity: existingItem.quantity + item.quantity }
          : existingItem
      );
    } else {
      // Add new item
      updatedItems = [...managerOrder.items, item];
    }

    const updatedOrder: TemporaryOrder = {
      ...managerOrder,
      items: updatedItems,
      updatedAt: now,
      sessionStartedAt: isFirstItem ? now : managerOrder.sessionStartedAt,
    };

    // Calculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setManagerOrder(updatedOrder);

    // If this is not the first item and order is already saved to Firestore, update it
    if (!isFirstItem && updatedOrder.id && !updatedOrder.id.startsWith('mgr_')) {
      // Order exists in Firestore, update it
      orderService.updateOrderItems(updatedOrder.id, updatedItems, currentUser?.uid || 'unknown')
        .catch(error => console.error('Error updating manager order items:', error));
    }
  }, [managerOrder, calculateOrderTotals, currentUser]);

  // Remove item from manager order
  const removeItemFromManagerOrder = useCallback((itemId: string) => {
    if (!managerOrder) return;

    const updatedOrder: TemporaryOrder = {
      ...managerOrder,
      items: managerOrder.items.filter(item => item.id !== itemId),
      updatedAt: new Date(),
    };

    // Recalculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setManagerOrder(updatedOrder);
  }, [managerOrder, calculateOrderTotals]);

  // Update item quantity
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (!managerOrder) return;

    if (quantity <= 0) {
      removeItemFromManagerOrder(itemId);
      return;
    }

    const updatedOrder: TemporaryOrder = {
      ...managerOrder,
      items: managerOrder.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ),
      updatedAt: new Date(),
    };

    // Recalculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setManagerOrder(updatedOrder);
  }, [managerOrder, removeItemFromManagerOrder, calculateOrderTotals]);

  // Clear manager order
  const clearManagerOrder = useCallback(async () => {
    if (managerOrder && managerOrder.tableIds.length > 0) {
      // Release tables when clearing the order
      for (const tableId of managerOrder.tableIds) {
        try {
          await releaseTable(tableId);
        } catch (error) {
          console.error(`Failed to release table ${tableId}:`, error);
        }
      }
    }
    
    setManagerOrder(null);
    const mainKey = getManagerOrderStorageKey();
    localStorage.removeItem(mainKey);
  }, [managerOrder, releaseTable, getManagerOrderStorageKey]);

  // Save manager order (persist to database)
  const saveManagerOrder = useCallback(async () => {
    if (!managerOrder || managerOrder.items.length === 0) return;

    try {
      console.log('Saving manager order:', managerOrder);
    } catch (error) {
      console.error('Error saving manager order:', error);
      throw error;
    }
  }, [managerOrder]);

  // Check for existing manager order on tables
  const checkForExistingManagerOrder = useCallback(async (tableIds: string[]): Promise<TemporaryOrder | null> => {
    try {
      // Check localStorage for existing manager orders on these tables
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('manager_pending_')) {
          try {
            const orderData = JSON.parse(localStorage.getItem(key) || '{}');
            if (orderData.tableIds && orderData.tableIds.some((tableId: string) => tableIds.includes(tableId))) {
              return {
                ...orderData,
                createdAt: new Date(orderData.createdAt),
                sessionStartedAt: new Date(orderData.sessionStartedAt),
                updatedAt: new Date(orderData.updatedAt),
              };
            }
          } catch (error) {
            console.error(`Error parsing manager order from ${key}:`, error);
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking for existing manager order:', error);
      return null;
    }
  }, []);

  // Calculate totals for display
  const calculateTotals = useCallback(() => {
    if (!managerOrder) {
      return { subtotal: 0, gst: 0, total: 0, cgstAmount: 0, sgstAmount: 0 };
    }
    return calculateOrderTotals(managerOrder.items);
  }, [managerOrder, calculateOrderTotals]);

  // Get table names for display
  const getTableNames = useCallback(() => {
    if (!managerOrder) return [];
    
    return managerOrder.tableIds.map(tableId => {
      const foundTable = tables.find(t => t.id === tableId);
      return foundTable?.name || `Table ${tableId}`;
    });
  }, [managerOrder, tables]);

  // Create partial manager order (save to database as ongoing order)
  const createPartialManagerOrder = useCallback(async () => {
    if (!managerOrder || managerOrder.items.length === 0) {
      throw new Error('No items in order to save');
    }

    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    try {
      console.log('Creating partial manager order:', managerOrder);
      
      // Create the order in Firestore using orderService
      const orderFormData = {
        tableIds: managerOrder.tableIds,
        tableNames: getTableNames(),
        orderType: managerOrder.orderType as 'dinein' | 'delivery',
        orderMode: managerOrder.orderMode as 'zomato' | 'swiggy' | 'in-store',
        items: managerOrder.items,
        customerName: managerOrder.customerName,
        customerPhone: managerOrder.customerPhone,
        deliveryAddress: managerOrder.deliveryAddress,
        notes: managerOrder.notes
      };

      const orderId = await orderService.createManagerOrder(
        orderFormData,
        currentUser,
        currentLocation.id,
        currentUser.franchiseId || 'default-franchise'
      );

      // Update the order with items and totals
      await orderService.updateOrderItems(orderId, managerOrder.items, currentUser.uid);

      // Update order status to ongoing
      const updatedOrder = {
        ...managerOrder,
        id: orderId,
        status: 'ongoing' as const,
        updatedAt: new Date(),
      };

      // Save to localStorage with manager_pending_ prefix
      const key = getManagerOrderStorageKey(updatedOrder.id);
      localStorage.setItem(key, JSON.stringify({
        ...updatedOrder,
        createdAt: updatedOrder.createdAt.toISOString(),
        sessionStartedAt: updatedOrder.sessionStartedAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      }));

      // Update current order
      setManagerOrder(updatedOrder);

      console.log('✅ Manager partial order created in Firestore:', updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Failed to create partial manager order:', error);
      throw error;
    }
  }, [managerOrder, currentUser, currentLocation, getManagerOrderStorageKey, getTableNames]);

  // Load manager order by ID
  const loadManagerOrder = useCallback(async (orderId: string) => {
    try {
      // First try to load from localStorage
      const key = getManagerOrderStorageKey(orderId);
      let stored = localStorage.getItem(key);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const order = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          sessionStartedAt: new Date(parsed.sessionStartedAt),
          updatedAt: new Date(parsed.updatedAt),
        };
        setManagerOrder(order);
        return order;
      }
      
      // If not in localStorage, try to load from Firestore
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        const managerOrder: TemporaryOrder = {
          id: orderId,
          locationId: orderData.locationId,
          tableIds: orderData.tableIds || [],
          staffId: orderData.staffId,
          orderType: orderData.orderType || 'dinein',
          orderNumber: orderData.orderNumber,
          items: orderData.items || [],
          status: orderData.status || 'ongoing',
          subtotal: orderData.subtotal || 0,
          gstAmount: orderData.gstAmount || 0,
          totalAmount: orderData.totalAmount || 0,
          isFinalOrder: false,
          sessionStartedAt: orderData.sessionStartedAt?.toDate() || orderData.createdAt?.toDate() || new Date(),
          createdAt: orderData.createdAt?.toDate() || new Date(),
          updatedAt: orderData.updatedAt?.toDate() || new Date(),
          orderMode: orderData.orderMode || 'in-store',
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.deliveryAddress,
          notes: orderData.notes,
        };
        
        setManagerOrder(managerOrder);
        
        // Also save to localStorage for caching
        saveToLocalStorage(managerOrder);
        
        return managerOrder;
      }
      
      throw new Error('Order not found');
    } catch (error) {
      console.error('Error loading manager order:', error);
      throw error;
    }
  }, [getManagerOrderStorageKey, saveToLocalStorage]);

  // Load order into cart (for editing existing orders)
  const loadOrderIntoCart = useCallback(async (orderId: string): Promise<TemporaryOrder> => {
    try {
      // First try to load from localStorage
      const key = getManagerOrderStorageKey(orderId);
      let stored = localStorage.getItem(key);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const order = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          sessionStartedAt: new Date(parsed.sessionStartedAt),
          updatedAt: new Date(parsed.updatedAt),
        };

        setManagerOrder(order);
        console.log('✅ Loaded manager order from localStorage into cart:', order);
        return order;
      }
      
      // If not in localStorage, try to load from Firestore
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        const managerOrder: TemporaryOrder = {
          id: orderId,
          locationId: orderData.locationId,
          tableIds: orderData.tableIds || [],
          staffId: orderData.staffId,
          orderType: orderData.orderType || 'dinein',
          orderNumber: orderData.orderNumber,
          items: orderData.items || [],
          status: orderData.status || 'ongoing',
          subtotal: orderData.subtotal || 0,
          gstAmount: orderData.gstAmount || 0,
          totalAmount: orderData.totalAmount || 0,
          isFinalOrder: false,
          sessionStartedAt: orderData.sessionStartedAt?.toDate() || orderData.createdAt?.toDate() || new Date(),
          createdAt: orderData.createdAt?.toDate() || new Date(),
          updatedAt: orderData.updatedAt?.toDate() || new Date(),
          orderMode: orderData.orderMode || 'in-store',
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          deliveryAddress: orderData.deliveryAddress,
          notes: orderData.notes,
        };
        
        setManagerOrder(managerOrder);
        
        // Also save to localStorage for caching
        saveToLocalStorage(managerOrder);
        
        console.log('✅ Loaded manager order from Firestore into cart:', managerOrder);
        return managerOrder;
      }
      
      throw new Error('Manager order not found');
    } catch (error) {
      console.error('Error loading manager order into cart:', error);
      throw error;
    }
  }, [getManagerOrderStorageKey, saveToLocalStorage]);

  // Update order mode for delivery orders
  const updateOrderMode = useCallback((orderMode: 'zomato' | 'swiggy' | 'in-store') => {
    if (!managerOrder || managerOrder.orderType !== 'delivery') return;

    const updatedOrder = {
      ...managerOrder,
      orderMode,
      updatedAt: new Date(),
    };

    setManagerOrder(updatedOrder);
  }, [managerOrder]);

  // Settle manager order (convert to final order)
  const settleManagerOrder = useCallback(async (paymentMethod: string) => {
    if (!managerOrder || !currentUser) {
      throw new Error('No manager order to settle or user not authenticated');
    }

    try {
      console.log('🧾 Settling manager order:', managerOrder);
      
      // Create final order data
      const finalOrder = {
        ...managerOrder,
        status: 'completed' as const,
        paymentMethod,
        settledAt: new Date(),
        settledBy: currentUser.uid,
        isFinalOrder: true,
        updatedAt: new Date(),
      };

      // Save to completed orders (in real implementation, this would be saved to database)
      const completedOrdersKey = `completed_orders_${currentUser.uid}`;
      const existingOrders = JSON.parse(localStorage.getItem(completedOrdersKey) || '[]');
      existingOrders.push(finalOrder);
      localStorage.setItem(completedOrdersKey, JSON.stringify(existingOrders));

      // Remove from manager pending orders
      const key = getManagerOrderStorageKey(managerOrder.id);
      localStorage.removeItem(key);

      // Release tables
      if (managerOrder.tableIds.length > 0) {
        for (const tableId of managerOrder.tableIds) {
          try {
            await releaseTable(tableId);
            console.log(`✅ Released table ${tableId}`);
          } catch (error) {
            console.error(`❌ Failed to release table ${tableId}:`, error);
          }
        }
      }

      // Clear current order
      setManagerOrder(null);

      console.log('✅ Manager order settled successfully');
      return finalOrder;
    } catch (error) {
      console.error('❌ Error settling manager order:', error);
      throw error;
    }
  }, [managerOrder, currentUser, releaseTable, getManagerOrderStorageKey]);

  const value: ManagerOrderContextType = {
    managerOrder,
    isManagerOrderActive: !!managerOrder,
    startManagerOrder,
    addItemToManagerOrder,
    removeItemFromManagerOrder,
    updateItemQuantity,
    clearManagerOrder,
    clearCurrentManagerOrder,
    setManagerOrder,
    saveManagerOrder,
    loadManagerOrder,
    createPartialManagerOrder,
    checkForExistingManagerOrder,
    calculateTotals,
    getTableNames,
    loadFromLocalStorage,
    updateOrderMode,
    loadOrderIntoCart,
    settleManagerOrder,
  };

  return (
    <ManagerOrderContext.Provider value={value}>
      {children}
    </ManagerOrderContext.Provider>
  );
};