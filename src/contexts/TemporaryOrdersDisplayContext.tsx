import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot, orderBy, documentId } from 'firebase/firestore';
import { db } from '../lib/db';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { Order } from '../types';

interface TemporaryOrdersDisplayContextType {
  temporaryOrders: Order[];
  loading: boolean;
  error: string | null;
  refreshTemporaryOrders: () => Promise<void>;
}

const TemporaryOrdersDisplayContext = createContext<TemporaryOrdersDisplayContextType | undefined>(undefined);

export const useTemporaryOrdersDisplay = () => {
  const context = useContext(TemporaryOrdersDisplayContext);
  if (context === undefined) {
    throw new Error('useTemporaryOrdersDisplay must be used within a TemporaryOrdersDisplayProvider');
  }
  return context;
};

interface TemporaryOrdersDisplayProviderProps {
  children: React.ReactNode;
}

export const TemporaryOrdersDisplayProvider: React.FC<TemporaryOrdersDisplayProviderProps> = ({ children }) => {
  const [temporaryOrders, setTemporaryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();

  const fetchTemporaryOrders = useCallback(async () => {
    if (!currentLocation || !currentUser) {
      setTemporaryOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query the temporary_orders collection to get active orders for this staff
      const tempOrdersQuery = query(
        collection(db, 'temporary_orders'),
        where('locationId', '==', currentLocation.id),
        where('staffId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(tempOrdersQuery, (snapshot) => {
        const ordersData: Order[] = [];
        
        // If no temporary orders found, return empty array
        if (snapshot.empty) {
          setTemporaryOrders([]);
          setLoading(false);
          return;
        }

        // Get the order IDs from temporary_orders - these are the active orders
        const tempOrderIds = snapshot.docs.map(doc => doc.data().orderId);
        
        if (tempOrderIds.length === 0) {
          setTemporaryOrders([]);
          setLoading(false);
          return;
        }

        // Now get the full order details from the orders collection
        // We'll show these orders regardless of their status since they're still in temporary_orders
        const ordersQuery = query(
          collection(db, 'orders'),
          where(documentId(), 'in', tempOrderIds)
        );

        const ordersUnsubscribe = onSnapshot(ordersQuery, (ordersSnapshot) => {
          const finalOrdersData: Order[] = [];
          ordersSnapshot.forEach((doc) => {
            const data = doc.data();
            // Show all orders that exist in temporary_orders (they are active for staff)
            finalOrdersData.push({
              id: doc.id,
              locationId: data.locationId,
              tableIds: data.tableIds || [],
              tableNames: data.tableNames || [],
              staffId: data.staffId,
              orderType: data.orderType || 'dinein',
              orderNumber: data.orderNumber,
              items: data.items || [],
              status: data.status,
              totalAmount: data.totalAmount || 0,
              subtotal: data.subtotal || 0,
              gstAmount: data.gstAmount || 0,
              isFinalOrder: data.isFinalOrder || false,
              paymentMethod: data.paymentMethod,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
              settledAt: data.settledAt?.toDate(),
              notes: data.notes,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              deliveryAddress: data.deliveryAddress,
              orderMode: data.orderMode,
              createdBy: data.staffId, // Map staffId to createdBy for compatibility
            });
          });
          
          // Sort client-side by createdAt (descending)
          finalOrdersData.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          setTemporaryOrders(finalOrdersData);
          setLoading(false);
        });

        // Return cleanup function for the inner subscription
        return () => ordersUnsubscribe();
      }, (error) => {
        console.error('Error fetching temporary orders:', error);
        setError(error.message);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up temporary orders listener:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch temporary orders');
      setLoading(false);
    }
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (currentLocation) {
      fetchTemporaryOrders().then((unsub) => {
        unsubscribe = unsub;
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchTemporaryOrders, currentLocation]);

  const refreshTemporaryOrders = useCallback(async () => {
    if (fetchTemporaryOrders) {
      const unsubscribe = await fetchTemporaryOrders();
      return unsubscribe;
    }
  }, [fetchTemporaryOrders]);

  const value: TemporaryOrdersDisplayContextType = {
    temporaryOrders,
    loading,
    error,
    refreshTemporaryOrders,
  };

  return (
    <TemporaryOrdersDisplayContext.Provider value={value}>
      {children}
    </TemporaryOrdersDisplayContext.Provider>
  );
};