import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { useTables } from './TableContext';
import { OrderItem, TemporaryOrder } from '../types';
import { orderService } from '../services/orderService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface TemporaryOrderContextType {
  temporaryOrder: TemporaryOrder | null;
  isTemporaryOrderActive: boolean;
  startTemporaryOrder: (tableIds: string[], orderType: 'dinein' | 'delivery', orderMode?: 'zomato' | 'swiggy' | 'in-store') => void;
  addItemToTemporaryOrder: (item: OrderItem) => void;
  removeItemFromTemporaryOrder: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearTemporaryOrder: () => void;
  clearCurrentOrder: () => void;
  setTemporaryOrder: (order: TemporaryOrder) => void;
  saveTemporaryOrder: () => void;
  loadTemporaryOrder: (orderId: string) => void;
  createPartialOrder: () => Promise<void>;
  checkForExistingOrder: (tableIds: string[]) => Promise<TemporaryOrder | null>;
  calculateTotals: () => { subtotal: number; gst: number; total: number; cgstAmount: number; sgstAmount: number };
  getTableNames: () => string[];
  transferOrderToManager: (orderId: string, staffId: string) => Promise<TemporaryOrder>;
  loadFromLocalStorage: () => TemporaryOrder | null;
  updateOrderMode: (orderMode: 'zomato' | 'swiggy' | 'in-store') => void;
  mergePartialOrder: (newItems: OrderItem[], existingOrderId: string) => Promise<TemporaryOrder>;
  loadOrderIntoCart: (orderId: string) => Promise<TemporaryOrder>;
}

const TemporaryOrderContext = createContext<TemporaryOrderContextType | undefined>(undefined);

export const useTemporaryOrder = () => {
  const context = useContext(TemporaryOrderContext);
  if (context === undefined) {
    throw new Error('useTemporaryOrder must be used within a TemporaryOrderProvider');
  }
  return context;
};

interface TemporaryOrderProviderProps {
  children: React.ReactNode;
}

export const TemporaryOrderProvider: React.FC<TemporaryOrderProviderProps> = ({ children }) => {
  const [temporaryOrder, setTemporaryOrder] = useState<TemporaryOrder | null>(null);
  const [gstRates, setGstRates] = useState({ cgst: 0, sgst: 0 });
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const { tables, occupyTable, releaseTable } = useTables();

  // Local storage key
  const TEMP_ORDER_STORAGE_KEY = 'restaurant_temporary_order';

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
            console.log('Loaded GST settings for temporary orders:', { cgst, sgst });
          }
        } catch (error) {
          console.error('Error loading GST settings for temporary orders:', error);
        }
      }
    };
    
    loadGstSettings();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

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

  // Save temporary order to localStorage
  const saveToLocalStorage = useCallback((order: TemporaryOrder) => {
    try {
      localStorage.setItem(TEMP_ORDER_STORAGE_KEY, JSON.stringify({
        ...order,
        createdAt: order.createdAt.toISOString(),
        sessionStartedAt: order.sessionStartedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error saving temporary order to localStorage:', error);
    }
  }, []);

  // Load temporary order from localStorage
  const loadFromLocalStorage = useCallback((): TemporaryOrder | null => {
    try {
      const stored = localStorage.getItem(TEMP_ORDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          sessionStartedAt: new Date(parsed.sessionStartedAt),
        };
      }
    } catch (error) {
      console.error('Error loading temporary order from localStorage:', error);
    }
    return null;
  }, []);

  // Auto-save to localStorage when order changes
  useEffect(() => {
    if (temporaryOrder) {
      saveToLocalStorage(temporaryOrder);
    }
  }, [temporaryOrder, saveToLocalStorage]);

  // Load temporary order on mount
  useEffect(() => {
    const savedOrder = loadFromLocalStorage();
    if (savedOrder && savedOrder.locationId === currentLocation?.id) {
      setTemporaryOrder(savedOrder);
    }
  }, [currentLocation, loadFromLocalStorage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Optional: You might want to clear the temporary order when the user leaves the page
      // For now, we'll keep it in localStorage so they can continue later
    };
  }, []);

  // Clear current temporary order from state and localStorage
  const clearCurrentOrder = useCallback(() => {
    console.log('🧹 Clearing current temporary order...');
    
    // Clear the state
    setTemporaryOrder(null);
    
    // Clear all localStorage keys related to temporary orders
    localStorage.removeItem(TEMP_ORDER_STORAGE_KEY);
    
    // Also clear any other potential stale data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_order_') || key.startsWith('manager_pending_') || key === 'restaurant_temporary_order')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log(`🗑️ Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log('✅ Temporary order cleared successfully');
  }, []);

  // Start a new temporary order
  const startTemporaryOrder = useCallback(async (tableIds: string[], orderType: 'dinein' | 'delivery', orderMode: 'zomato' | 'swiggy' | 'in-store' = 'in-store') => {
    console.log('🆕 Starting new temporary order with:', { tableIds, orderType, orderMode });
    
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    // Clear any existing temporary order first
    console.log('🧹 Clearing existing temporary order before starting new one');
    clearCurrentOrder();

    const now = new Date();

    const newOrder: TemporaryOrder = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      locationId: currentLocation.id,
      tableIds,
      staffId: currentUser.uid,
      orderType,
      orderNumber: `TEMP-${Date.now().toString().slice(-6)}`,
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

    console.log('✅ Created new temporary order:', newOrder);
    setTemporaryOrder(newOrder);
    
    // Update table status to occupied and store the order ID
    if (orderType === 'dinein') {
      for (const tableId of tableIds) {
        try {
          await occupyTable(tableId, newOrder.id);
        } catch (error) {
          // If table occupation fails, it's likely because the table was just created
          // The order service already handles table creation, so we can log and continue
          console.log(`Table ${tableId} occupation handled by order service`);
        }
      }
    }
  }, [currentUser, currentLocation, occupyTable, clearCurrentOrder]);

  // Add item to temporary order
  const addItemToTemporaryOrder = useCallback((item: OrderItem) => {
    if (!temporaryOrder) return;

    // If this is the first item, update sessionStartedAt to now
    const isFirstItem = temporaryOrder.items.length === 0;
    const now = new Date();

    // Check if an identical item already exists (same menuItemId, portionSize, modifications, and notes)
    const existingItemIndex = temporaryOrder.items.findIndex(existingItem =>
      existingItem.menuItemId === item.menuItemId &&
      existingItem.portionSize === item.portionSize &&
      JSON.stringify(existingItem.modifications) === JSON.stringify(item.modifications) &&
      existingItem.notes === item.notes
    );

    let updatedItems: OrderItem[];
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      updatedItems = temporaryOrder.items.map((existingItem, index) =>
        index === existingItemIndex
          ? { ...existingItem, quantity: existingItem.quantity + item.quantity }
          : existingItem
      );
    } else {
      // Add new item
      updatedItems = [...temporaryOrder.items, item];
    }

    const updatedOrder: TemporaryOrder = {
      ...temporaryOrder,
      items: updatedItems,
      updatedAt: now,
      // Update sessionStartedAt only for first item
      sessionStartedAt: isFirstItem ? now : temporaryOrder.sessionStartedAt,
    };

    // Calculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setTemporaryOrder(updatedOrder);
  }, [temporaryOrder, calculateOrderTotals]);

  // Merge partial order with existing ongoing order
  const mergePartialOrder = useCallback(async (newItems: OrderItem[], existingOrderId: string) => {
    try {
      // Load existing order from localStorage
      const existingOrderData = localStorage.getItem(`temp_order_${existingOrderId}`);
      if (!existingOrderData) {
        throw new Error('Existing order not found');
      }

      const existingOrder: TemporaryOrder = JSON.parse(existingOrderData);
      
      // Merge items - combine quantities for identical items
      const mergedItems: OrderItem[] = [...existingOrder.items];
      
      for (const newItem of newItems) {
        const existingItemIndex = mergedItems.findIndex(item =>
          item.menuItemId === newItem.menuItemId &&
          item.portionSize === newItem.portionSize &&
          JSON.stringify(item.modifications) === JSON.stringify(newItem.modifications) &&
          item.notes === newItem.notes
        );

        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          mergedItems[existingItemIndex] = {
            ...mergedItems[existingItemIndex],
            quantity: mergedItems[existingItemIndex].quantity + newItem.quantity
          };
        } else {
          // Add new item
          mergedItems.push(newItem);
        }
      }

      // Calculate new totals
      const totals = calculateOrderTotals(mergedItems);
      
      // Update existing order
      const updatedOrder: TemporaryOrder = {
        ...existingOrder,
        items: mergedItems,
        subtotal: totals.subtotal,
        gstAmount: totals.gst,
        totalAmount: totals.total,
        updatedAt: new Date(),
        status: 'ongoing'
      };

      // Save updated order
      localStorage.setItem(`temp_order_${existingOrderId}`, JSON.stringify({
        ...updatedOrder,
        createdAt: updatedOrder.createdAt.toISOString(),
        sessionStartedAt: updatedOrder.sessionStartedAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      }));

      // Update current temporary order if it's the same one
      if (temporaryOrder && temporaryOrder.id === existingOrderId) {
        setTemporaryOrder({
          ...updatedOrder,
          createdAt: new Date(updatedOrder.createdAt),
          sessionStartedAt: new Date(updatedOrder.sessionStartedAt),
        });
      }

      console.log('Merged partial order:', updatedOrder);
      return updatedOrder;
    } catch (error) {
      console.error('Error merging partial order:', error);
      throw error;
    }
  }, [temporaryOrder, calculateOrderTotals]);

  // Remove item from temporary order
  const removeItemFromTemporaryOrder = useCallback((itemId: string) => {
    if (!temporaryOrder) return;

    const updatedOrder: TemporaryOrder = {
      ...temporaryOrder,
      items: temporaryOrder.items.filter(item => item.id !== itemId),
      updatedAt: new Date(),
    };

    // Recalculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setTemporaryOrder(updatedOrder);
  }, [temporaryOrder, calculateOrderTotals]);

  // Update item quantity
  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (!temporaryOrder) return;

    if (quantity <= 0) {
      removeItemFromTemporaryOrder(itemId);
      return;
    }

    const updatedOrder: TemporaryOrder = {
      ...temporaryOrder,
      items: temporaryOrder.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ),
      updatedAt: new Date(),
    };

    // Recalculate totals
    const totals = calculateOrderTotals(updatedOrder.items);
    updatedOrder.subtotal = totals.subtotal;
    updatedOrder.gstAmount = totals.gst;
    updatedOrder.totalAmount = totals.total;

    setTemporaryOrder(updatedOrder);
  }, [temporaryOrder, removeItemFromTemporaryOrder, calculateOrderTotals]);

  // Clear temporary order
  const clearTemporaryOrder = useCallback(async () => {
    if (temporaryOrder && temporaryOrder.tableIds.length > 0) {
      // Release tables when clearing the order
      for (const tableId of temporaryOrder.tableIds) {
        try {
          await releaseTable(tableId);
        } catch (error) {
          console.error(`Failed to release table ${tableId}:`, error);
        }
      }
    }
    
    setTemporaryOrder(null);
    localStorage.removeItem(TEMP_ORDER_STORAGE_KEY);
  }, [temporaryOrder, releaseTable]);

  // Save temporary order (persist to database)
  const saveTemporaryOrder = useCallback(async () => {
    if (!temporaryOrder || temporaryOrder.items.length === 0) return;

    try {
      // This would typically call the OrderContext to save the order
      // For now, we'll just keep it in localStorage
      console.log('Saving temporary order:', temporaryOrder);
    } catch (error) {
      console.error('Error saving temporary order:', error);
      throw error;
    }
  }, [temporaryOrder]);

  // Create partial order (save to database as ongoing order)
  const createPartialOrder = useCallback(async () => {
    if (!temporaryOrder || temporaryOrder.items.length === 0) {
      throw new Error('No items in order to save');
    }

    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    try {
      console.log('Creating partial order in Firestore:', temporaryOrder);
      console.log('Current user:', currentUser);
      console.log('Current location:', currentLocation);
      
      // Use orderService to create the temporary order in Firestore
      
      // Get table names from table IDs
      const tableNames = temporaryOrder.tableIds.map(id => {
        const table = tables.find(t => t.id === id);
        if (table) {
          return table.name || `Table ${table.number}`;
        }
        
        // Fallback: extract table number from ID
        const tableMatch = id.match(/table-(\d+)/i);
        if (tableMatch) {
          return `Table ${tableMatch[1]}`;
        }
        if (/^\d+$/.test(id)) {
          return `Table ${id}`;
        }
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `Table ${numberMatch[0]}`;
        }
        return id;
      });
      
      // Filter out undefined fields before sending to Firestore
      const orderFormData = {
        tableIds: temporaryOrder.tableIds,
        tableNames,
        orderType: temporaryOrder.orderType as 'dinein' | 'delivery',
        orderMode: temporaryOrder.orderMode,
        items: temporaryOrder.items,
        ...(temporaryOrder.customerName !== undefined && { customerName: temporaryOrder.customerName }),
        ...(temporaryOrder.customerPhone !== undefined && { customerPhone: temporaryOrder.customerPhone }),
        ...(temporaryOrder.deliveryAddress !== undefined && { deliveryAddress: temporaryOrder.deliveryAddress }),
        ...(temporaryOrder.notes !== undefined && { notes: temporaryOrder.notes }),
      };

      console.log('Order form data:', orderFormData);

      // Create the order in Firestore with status 'temporary'
      const orderId = await orderService.createTemporaryOrder(
        orderFormData,
        currentUser,
        currentLocation.id,
        currentLocation.franchiseId || 'default-franchise'
      );

      console.log('Order created with ID:', orderId);

      // Update the order with items and change status to 'ongoing'
      await orderService.updateOrderItems(orderId, temporaryOrder.items, currentUser.uid);

      console.log(`Partial order ${orderId} created in Firestore`);

      // Create the updated order object for return
      const updatedOrder: TemporaryOrder = {
        ...temporaryOrder,
        id: orderId, // Use the real Firestore ID
        status: 'ongoing',
        updatedAt: new Date(),
      };

      // Update the current state
      setTemporaryOrder(updatedOrder);
      
      // Save to localStorage with a specific key for this order
      localStorage.setItem(`temp_order_${orderId}`, JSON.stringify({
        ...updatedOrder,
        createdAt: updatedOrder.createdAt.toISOString(),
        sessionStartedAt: updatedOrder.sessionStartedAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      }));
      
      // Also update the main localStorage to maintain consistency
      localStorage.setItem(TEMP_ORDER_STORAGE_KEY, JSON.stringify({
        ...updatedOrder,
        createdAt: updatedOrder.createdAt.toISOString(),
        sessionStartedAt: updatedOrder.sessionStartedAt.toISOString(),
      }));
      
      console.log(`Partial order ${orderId} saved to Firestore and localStorage`);
      
      return updatedOrder;
    } catch (error) {
      console.error('Error creating partial order:', error);
      throw error;
    }
  }, [temporaryOrder, currentUser, currentLocation]);

  // Set temporary order directly
  const setTemporaryOrderDirect = useCallback((order: TemporaryOrder) => {
    setTemporaryOrder(order);
  }, []);

  // Check for existing order on tables
  const checkForExistingOrder = useCallback(async (tableIds: string[]): Promise<TemporaryOrder | null> => {
    try {
      // Check if any of the tables have existing orders
      for (const tableId of tableIds) {
        const table = tables.find(t => t.id === tableId);
        if (table?.currentOrderId) {
          // First check if there's an order in localStorage with the specific order ID
          const specificOrderKey = `temp_order_${table.currentOrderId}`;
          const specificOrderData = localStorage.getItem(specificOrderKey);
          
          if (specificOrderData) {
            const order = JSON.parse(specificOrderData);
            return {
              ...order,
              createdAt: new Date(order.createdAt),
              sessionStartedAt: new Date(order.sessionStartedAt),
              updatedAt: new Date(order.updatedAt),
            };
          }
          
          // Also check the main localStorage as fallback
          const savedOrder = loadFromLocalStorage();
          if (savedOrder && 
              savedOrder.tableIds.includes(tableId) && 
              (savedOrder.status === 'ongoing' || savedOrder.status === 'temporary') &&
              savedOrder.locationId === currentLocation?.id) {
            return savedOrder;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error checking for existing order:', error);
      return null;
    }
  }, [tables, currentLocation, loadFromLocalStorage]);

  // Load existing temporary order
  const loadTemporaryOrder = useCallback((orderId: string) => {
    // This would typically load from database
    // For now, we'll just use localStorage
    const savedOrder = loadFromLocalStorage();
    if (savedOrder && savedOrder.id === orderId) {
      setTemporaryOrder(savedOrder);
    }
  }, [loadFromLocalStorage]);

  // Public calculate totals method
  const calculateTotals = useCallback(() => {
    if (!temporaryOrder) {
      return { subtotal: 0, gst: 0, total: 0, cgstAmount: 0, sgstAmount: 0 };
    }
    const totals = calculateOrderTotals(temporaryOrder.items);
    return {
      subtotal: totals.subtotal,
      gst: totals.gstAmount,
      total: totals.total,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount
    };
  }, [temporaryOrder, calculateOrderTotals]);

  // Get table names for display
  const getTableNames = useCallback(() => {
    if (!temporaryOrder) return [];
    
    return temporaryOrder.tableIds.map(tableId => {
      const table = tables.find(t => t.id === tableId);
      return table?.name || `Table ${tableId}`;
    });
  }, [temporaryOrder, tables]);

  // Transfer order to manager's pending orders
  const transferOrderToManager = useCallback(async (orderId: string, staffId: string, notes?: string) => {
    try {
      console.log('🔄 Starting transfer process for order:', orderId, 'by staff:', staffId, 'with notes:', notes);
      
      let order = null;
      
      // First, check if this is the current temporary order
      if (temporaryOrder && temporaryOrder.id === orderId) {
        console.log('✅ Found order in current temporary order context');
        order = temporaryOrder;
      } else {
        // Load the order from specific localStorage key first
        const specificOrderKey = `temp_order_${orderId}`;
        console.log('📦 Looking for order in localStorage key:', specificOrderKey);
        const specificOrderData = localStorage.getItem(specificOrderKey);
        if (specificOrderData) {
          console.log('✅ Found order in specific localStorage key');
          const parsedOrder = JSON.parse(specificOrderData);
          order = {
            ...parsedOrder,
            createdAt: new Date(parsedOrder.createdAt),
            sessionStartedAt: new Date(parsedOrder.sessionStartedAt),
            updatedAt: new Date(parsedOrder.updatedAt),
          };
        } else {
          console.log('❌ Order not found in specific key, checking generic key');
          // Check the generic temporary order key
          const genericOrderData = localStorage.getItem('restaurant_temporary_order');
          if (genericOrderData) {
            const parsedOrder = JSON.parse(genericOrderData);
            if (parsedOrder.id === orderId) {
              console.log('✅ Found order in generic localStorage key');
              order = {
                ...parsedOrder,
                createdAt: new Date(parsedOrder.createdAt),
                sessionStartedAt: new Date(parsedOrder.sessionStartedAt),
                updatedAt: new Date(parsedOrder.updatedAt),
              };
            }
          }
          
          if (!order) {
            console.log('❌ Order not found in any localStorage location, checking Firestore...');
            
            // Try to find the order in Firestore
            try {
              const { doc, getDoc } = await import('firebase/firestore');
              const { db } = await import('../lib/db');
              
              const orderRef = doc(db, 'orders', orderId);
              const orderDoc = await getDoc(orderRef);
              
              if (orderDoc.exists()) {
                console.log('✅ Found order in Firestore');
                const orderData = orderDoc.data();
                order = {
                  id: orderDoc.id,
                  locationId: orderData.locationId,
                  tableIds: orderData.tableIds || [],
                  tableNames: orderData.tableNames || [],
                  staffId: orderData.staffId,
                  orderType: orderData.orderType || 'dinein',
                  orderNumber: orderData.orderNumber,
                  items: orderData.items || [],
                  status: orderData.status,
                  totalAmount: orderData.totalAmount || 0,
                  subtotal: orderData.subtotal || 0,
                  gstAmount: orderData.gstAmount || 0,
                  isFinalOrder: orderData.isFinalOrder || false,
                  paymentMethod: orderData.paymentMethod,
                  createdAt: orderData.createdAt?.toDate() || new Date(),
                  updatedAt: orderData.updatedAt?.toDate() || new Date(),
                  settledAt: orderData.settledAt?.toDate(),
                  notes: orderData.notes,
                  customerName: orderData.customerName,
                  customerPhone: orderData.customerPhone,
                  deliveryAddress: orderData.deliveryAddress,
                  orderMode: orderData.orderMode,
                  sessionStartedAt: orderData.createdAt?.toDate() || new Date(),
                };
                console.log('📋 Order data from Firestore:', order);
              } else {
                console.log('❌ Order not found in Firestore either');
                throw new Error(`Order not found: ${orderId}`);
              }
            } catch (firestoreError) {
              console.error('❌ Error checking Firestore:', firestoreError);
              throw new Error(`Order not found: ${orderId}`);
            }
          }
        }
      }

      console.log('📋 Original order:', order);

      // Use the orderService to properly transfer the order
      // This will handle updating the order status, creating manager pending record,
      // and removing from temporary_orders collection
      try {
        console.log('🔄 Using orderService to transfer order to manager');
        await orderService.transferOrderToManager(orderId, staffId, notes);
        console.log('✅ Order successfully transferred to manager via orderService');
      } catch (serviceError) {
        console.error('❌ Error transferring order via orderService:', serviceError);
        throw new Error(`Failed to transfer order: ${serviceError.message}`);
      }

      // Clear the current temporary order if it matches
      if (temporaryOrder && temporaryOrder.id === orderId) {
        console.log('🧹 Clearing current temporary order');
        clearTemporaryOrder();
      }

      // Clear localStorage entries for this order
      const specificOrderKey = `temp_order_${orderId}`;
      const genericOrderKey = 'restaurant_temporary_order';
      
      if (localStorage.getItem(specificOrderKey)) {
        console.log('🗑️ Removing order from localStorage:', specificOrderKey);
        localStorage.removeItem(specificOrderKey);
      }
      
      if (localStorage.getItem(genericOrderKey)) {
        const genericOrderData = JSON.parse(localStorage.getItem(genericOrderKey)!);
        if (genericOrderData.id === orderId) {
          console.log('🗑️ Removing order from generic localStorage key');
          localStorage.removeItem(genericOrderKey);
        }
      }

      console.log('✅ Order transferred to manager successfully:', {
        orderId,
        transferredBy: staffId,
        notes
      });
      
      // Return a minimal order object for compatibility
      return {
        id: orderId,
        ...order,
        status: 'transferred',
        transferredAt: new Date(),
        transferredBy: staffId,
      };
    } catch (error) {
      console.error('❌ Error transferring order to manager:', error);
      throw error;
    }
  }, [temporaryOrder, loadFromLocalStorage, clearTemporaryOrder, currentUser, currentLocation]);

  // Update order mode
  const updateOrderMode = useCallback((orderMode: 'zomato' | 'swiggy' | 'in-store') => {
    if (!temporaryOrder || temporaryOrder.orderType !== 'delivery') return;

    const updatedOrder: TemporaryOrder = {
      ...temporaryOrder,
      orderMode,
      updatedAt: new Date(),
    };

    setTemporaryOrder(updatedOrder);
  }, [temporaryOrder]);

  // Load order items into cart for editing
  const loadOrderIntoCart = useCallback(async (orderId: string) => {
    try {
      console.log('🔍 loadOrderIntoCart: Starting to load order:', orderId);
      
      // First try to load from the database
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/db');
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      let order = null;
      let dataSource = '';
      
      if (orderDoc.exists()) {
        order = {
          id: orderDoc.id,
          ...orderDoc.data(),
          createdAt: orderDoc.data().createdAt?.toDate(),
          updatedAt: orderDoc.data().updatedAt?.toDate(),
          sessionStartedAt: orderDoc.data().sessionStartedAt?.toDate(),
        };
        dataSource = 'Firestore Database';
        console.log('📦 Loaded order from database:', order);
      } else {
        console.log('🔍 Order not found in database, checking localStorage...');
        
        // Fallback to localStorage if database fails
        const specificOrderKey = `temp_order_${orderId}`;
        const managerOrderKey = `manager_pending_${orderId}`;
        let specificOrderData = localStorage.getItem(specificOrderKey);
        
        // If not found in temp_order, check manager_pending
        if (!specificOrderData) {
          specificOrderData = localStorage.getItem(managerOrderKey);
          if (specificOrderData) {
            dataSource = 'Manager Pending localStorage';
            console.log('📋 Loaded order from manager_pending localStorage:', specificOrderData);
          }
        } else {
          dataSource = 'Temp Order localStorage';
          console.log('📋 Loaded order from temp_order localStorage:', specificOrderData);
        }
        
        if (specificOrderData) {
          order = JSON.parse(specificOrderData);
          console.log('🔍 Parsed order from localStorage:', order);
        } else {
          // Final fallback to main localStorage
          console.log('🔍 Checking main localStorage as final fallback...');
          order = loadFromLocalStorage();
          if (!order || order.id !== orderId) {
            console.error('❌ Order not found in any storage location');
            throw new Error('Order not found');
          }
          dataSource = 'Main localStorage fallback';
          console.log('📋 Loaded order from main localStorage fallback:', order);
        }
      }

      console.log(`🎯 Final order loaded from ${dataSource}:`, {
        id: order.id,
        tableIds: order.tableIds,
        tableNames: order.tableNames,
        itemsCount: order.items?.length || 0,
        items: order.items?.map(item => ({ name: item.name, quantity: item.quantity }))
      });

      // Convert to TemporaryOrder format and set as current order
      const temporaryOrderData: TemporaryOrder = {
        ...order,
        createdAt: new Date(order.createdAt),
        sessionStartedAt: new Date(order.sessionStartedAt),
        updatedAt: new Date(order.updatedAt),
      };

      // Set this as the current temporary order for editing
      setTemporaryOrder(temporaryOrderData);
      
      // Also save to main localStorage for consistency
      localStorage.setItem(TEMP_ORDER_STORAGE_KEY, JSON.stringify({
        ...temporaryOrderData,
        createdAt: temporaryOrderData.createdAt.toISOString(),
        sessionStartedAt: temporaryOrderData.sessionStartedAt.toISOString(),
        updatedAt: temporaryOrderData.updatedAt.toISOString(),
      }));

      console.log('✅ Successfully loaded order into cart for editing:', temporaryOrderData);
      return temporaryOrderData;
    } catch (error) {
      console.error('❌ Error loading order into cart:', error);
      throw error;
    }
  }, [loadFromLocalStorage]);

  const value: TemporaryOrderContextType = {
    temporaryOrder,
    isTemporaryOrderActive: !!temporaryOrder,
    startTemporaryOrder,
    addItemToTemporaryOrder,
    removeItemFromTemporaryOrder,
    updateItemQuantity,
    clearTemporaryOrder,
    clearCurrentOrder,
    setTemporaryOrder: setTemporaryOrderDirect,
    saveTemporaryOrder,
    loadTemporaryOrder,
    createPartialOrder,
    checkForExistingOrder,
    calculateTotals,
    getTableNames,
    transferOrderToManager,
    loadFromLocalStorage,
    updateOrderMode,
    mergePartialOrder,
    loadOrderIntoCart,
  };

  return (
    <TemporaryOrderContext.Provider value={value}>
      {children}
    </TemporaryOrderContext.Provider>
  );
};