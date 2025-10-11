import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { useTables } from './TableContext';
import { OrderItem, TemporaryOrder } from '../types';

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
  calculateTotals: () => { subtotal: number; gst: number; total: number };
  getTableNames: () => string[];
  transferOrderToManager: (orderId: string, staffId: string) => Promise<void>;
  loadFromLocalStorage: () => TemporaryOrder | null;
  updateOrderMode: (orderMode: 'zomato' | 'swiggy' | 'in-store') => void;
  mergePartialOrder: (newItems: OrderItem[], existingOrderId: string) => Promise<TemporaryOrder>;
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
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const { tables, occupyTable, releaseTable } = useTables();

  // Local storage key
  const TEMP_ORDER_STORAGE_KEY = 'restaurant_temporary_order';

  // Calculate GST rates (you can make this configurable)
  const GST_RATES = {
    cgst: 2.5, // 2.5% CGST
    sgst: 2.5, // 2.5% SGST
    total: 5   // 5% total GST
  };

  // Calculate order totals
  const calculateOrderTotals = useCallback((items: OrderItem[]) => {
    const subtotal = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const gst = subtotal * (GST_RATES.total / 100);
    const total = subtotal + gst;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [GST_RATES.total]);

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

  // Start a new temporary order
  const startTemporaryOrder = useCallback(async (tableIds: string[], orderType: 'dinein' | 'delivery', orderMode: 'zomato' | 'swiggy' | 'in-store' = 'in-store') => {
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

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
      orderMode: orderType === 'delivery' ? orderMode : undefined,
    };

    setTemporaryOrder(newOrder);
    
    // Update table status to occupied and store the order ID
    if (orderType === 'dinein') {
      for (const tableId of tableIds) {
        try {
          await occupyTable(tableId, newOrder.id);
        } catch (error) {
          console.error(`Failed to occupy table ${tableId}:`, error);
        }
      }
    }
  }, [currentUser, currentLocation, occupyTable]);

  // Add item to temporary order
  const addItemToTemporaryOrder = useCallback((item: OrderItem) => {
    if (!temporaryOrder) return;

    // If this is the first item, update sessionStartedAt to now
    const isFirstItem = temporaryOrder.items.length === 0;
    const now = new Date();

    // Check if an identical item already exists (same menuItemId, modifications, and notes)
    const existingItemIndex = temporaryOrder.items.findIndex(existingItem =>
      existingItem.menuItemId === item.menuItemId &&
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

    try {
      // Create the partial order with status 'ongoing'
      const updatedOrder: TemporaryOrder = {
        ...temporaryOrder,
        status: 'ongoing',
        updatedAt: new Date(),
      };

      // Update the current state
      setTemporaryOrder(updatedOrder);
      console.log('Created partial order:', updatedOrder);
      
      // Save to localStorage with a specific key for this order
      localStorage.setItem(`temp_order_${updatedOrder.id}`, JSON.stringify({
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
      
      console.log(`Partial order ${updatedOrder.id} saved to localStorage`);
      
      // The tables are already occupied when the temporary order was started
      // So we don't need to do anything else here
      
      return updatedOrder;
    } catch (error) {
      console.error('Error creating partial order:', error);
      throw error;
    }
  }, [temporaryOrder]);

  // Clear current temporary order from state (but keep in localStorage)
  const clearCurrentOrder = useCallback(() => {
    setTemporaryOrder(null);
  }, []);

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
      return { subtotal: 0, gst: 0, total: 0 };
    }
    return calculateOrderTotals(temporaryOrder.items);
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
  const transferOrderToManager = useCallback(async (orderId: string, staffId: string) => {
    try {
      // Load the order from specific localStorage key first
      const specificOrderKey = `temp_order_${orderId}`;
      let order = null;
      
      const specificOrderData = localStorage.getItem(specificOrderKey);
      if (specificOrderData) {
        const parsedOrder = JSON.parse(specificOrderData);
        order = {
          ...parsedOrder,
          createdAt: new Date(parsedOrder.createdAt),
          sessionStartedAt: new Date(parsedOrder.sessionStartedAt),
          updatedAt: new Date(parsedOrder.updatedAt),
        };
      } else {
        // Fallback to main localStorage
        order = loadFromLocalStorage();
        if (!order || order.id !== orderId) {
          throw new Error('Order not found');
        }
      }

      // Update order status to 'transferred'
      const transferredOrder: TemporaryOrder = {
        ...order,
        status: 'transferred',
        transferredAt: new Date(),
        transferredBy: staffId,
        updatedAt: new Date(),
      };

      // Save to manager pending orders
      localStorage.setItem(`manager_pending_${orderId}`, JSON.stringify({
        ...transferredOrder,
        createdAt: transferredOrder.createdAt.toISOString(),
        sessionStartedAt: transferredOrder.sessionStartedAt.toISOString(),
        transferredAt: transferredOrder.transferredAt?.toISOString(),
        updatedAt: transferredOrder.updatedAt.toISOString(),
      }));

      // Update the original order status
      localStorage.setItem(specificOrderKey, JSON.stringify({
        ...transferredOrder,
        createdAt: transferredOrder.createdAt.toISOString(),
        sessionStartedAt: transferredOrder.sessionStartedAt.toISOString(),
        transferredAt: transferredOrder.transferredAt?.toISOString(),
        updatedAt: transferredOrder.updatedAt.toISOString(),
      }));

      console.log('Order transferred to manager:', transferredOrder);
      return transferredOrder;
    } catch (error) {
      console.error('Error transferring order to manager:', error);
      throw error;
    }
  }, [loadFromLocalStorage]);

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
  };

  return (
    <TemporaryOrderContext.Provider value={value}>
      {children}
    </TemporaryOrderContext.Provider>
  );
};