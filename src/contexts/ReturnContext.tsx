import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Return, ReturnFormData, ReturnItem } from '../types';
import { useProducts } from './ProductContext';
import { useSales } from './SalesContext';
import { useLocations } from './LocationContext';
import { useAuth } from './AuthContext';

interface ReturnContextType {
  returns: Return[];
  loading: boolean;
  error: string | null;
  addReturn: (data: ReturnFormData) => Promise<void>;
  refreshReturns: () => Promise<void>;
  isItemReturned: (orderId: string, itemId: string) => boolean;
  getReturnedItems: (orderId: string) => ReturnItem[];
  isOrderReturned: (orderId: string) => boolean;
  getOrderReturns: (orderId: string) => Return[];
  getTotalReturnAmount: (orderId: string) => number;
}

const ReturnContext = createContext<ReturnContextType | null>(null);

export const useReturns = () => {
  const context = useContext(ReturnContext);
  if (!context) {
    throw new Error('useReturns must be used within a ReturnProvider');
  }
  return context;
};

interface ReturnProviderProps {
  children: ReactNode;
}

export const ReturnProvider: React.FC<ReturnProviderProps> = ({ children }) => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products, updateProduct } = useProducts();
  const { refreshSales } = useSales();
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();

  const refreshReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      let querySnapshot;
      
      if (currentLocation) {
        // If a location is selected, get all returns and filter client-side
        const q = query(
          collection(db, 'returns'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentLocation.id)
        };
      } else if (currentUser?.role === 'staff' && currentUser?.locationId) {
        // Staff can only see returns from their location
        const q = query(
          collection(db, 'returns'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'manager' && currentUser?.locationId) {
        // Manager can only see returns from their location
        const q = query(
          collection(db, 'returns'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'admin') {
        // Admin can see returns from all locations in their franchise
        if (currentUser?.franchiseId) {
          const q = query(
            collection(db, 'returns'),
            orderBy('createdAt', 'desc')
          );
          const allSnapshot = await getDocs(q);
          
          // Get all locations for this admin's franchise
          const locationsQuery = query(
            collection(db, 'locations'),
            where('franchiseId', '==', currentUser.franchiseId)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          const franchiseLocationIds = locationsSnapshot.docs.map(doc => doc.id);
          
          // Filter returns by franchise location IDs
          querySnapshot = {
            docs: allSnapshot.docs.filter(doc => 
              franchiseLocationIds.includes(doc.data().locationId)
            )
          };
        } else {
          // Admin without franchiseId - no access
          querySnapshot = { docs: [] };
        }
      } else {
        // Otherwise get all returns (for superadmin)
        const q = query(
          collection(db, 'returns'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      }
      
      const returnsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Return[];
      
      setReturns(returnsData);
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError(err.message || 'Failed to fetch returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshReturns();
  }, [currentLocation, currentUser]);

  const isItemReturned = (orderId: string, itemId: string) => {
    const hasReturn = returns.some(r => 
      r.referenceId === orderId && 
      r.items.some(item => item.id === itemId)
    );
    return hasReturn;
  };

  const isOrderReturned = (orderId: string) => {
    const hasReturn = returns.some(r => r.referenceId === orderId);
    return hasReturn;
  };

  const getReturnedItems = (orderId: string) => {
    const items = returns
      .filter(r => r.referenceId === orderId)
      .flatMap(r => r.items);
    return items;
  };

  const getOrderReturns = (orderId: string) => {
    const orderReturns = returns.filter(r => r.referenceId === orderId);
    return orderReturns;
  };

  const getTotalReturnAmount = (orderId: string) => {
    const total = returns
      .filter(r => r.referenceId === orderId)
      .reduce((total, r) => total + r.total, 0);
    return total;
  };

  const addReturn = async (data: ReturnFormData) => {
    setError(null);
    try {
      // Validate that items haven't already been returned
      for (const item of data.items) {
        if (isItemReturned(data.referenceId, item.id)) {
          throw new Error(`Item "${item.name}" has already been returned`);
        }
      }

      // Use the total from the form data if provided, otherwise calculate
      const total = data.total || data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Determine the locationId to use
      let locationId = null;
      
      if (currentLocation) {
        locationId = currentLocation.id;
      } else if (currentUser?.locationId) {
        locationId = currentUser.locationId;
      }
      
      if (!locationId && currentUser?.role !== 'superadmin') {
        throw new Error('No location available. Please select a location or contact an administrator.');
      }

      // Update product quantities
      for (const item of data.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Product not found: ${item.name}`);
        }

        // For sales returns, increase stock
        // For purchase returns, decrease stock
        const quantityChange = data.type === 'sale' ? item.quantity : -item.quantity;

        await updateProduct(product.id, {
          ...product,
          quantity: product.quantity + quantityChange
        });
      }

      // Add return record
      const returnData = {
        type: data.type,
        referenceId: data.referenceId,
        items: data.items,
        reason: data.reason,
        total,
        refundMethod: data.refundMethod,
        locationId: locationId,
        createdBy: currentUser?.uid,
        status: 'completed',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'returns'), returnData);
      
      // Refresh both returns and sales data
      await Promise.all([
        refreshReturns(),
        refreshSales()
      ]);
    } catch (err: any) {
      console.error('Error adding return:', err);
      setError(err.message || 'Failed to process return');
      throw err;
    }
  };

  const value: ReturnContextType = {
    returns,
    loading,
    error,
    addReturn,
    refreshReturns,
    isItemReturned,
    getReturnedItems,
    isOrderReturned,
    getOrderReturns,
    getTotalReturnAmount
  };

  return (
    <ReturnContext.Provider value={value}>
      {children}
    </ReturnContext.Provider>
  );
};