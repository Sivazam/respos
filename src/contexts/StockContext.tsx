import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { StockUpdate, StockUpdateFormData } from '../types';
import { useProducts } from './ProductContext';
import { useLocations } from './LocationContext';
import { useAuth } from './AuthContext';

interface StockContextType {
  stockUpdates: StockUpdate[];
  loading: boolean;
  error: string | null;
  addStockUpdate: (data: StockUpdateFormData) => Promise<void>;
  refreshStockUpdates: () => Promise<void>;
}

const StockContext = createContext<StockContextType | null>(null);

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
};

interface StockProviderProps {
  children: ReactNode;
}

export const StockProvider: React.FC<StockProviderProps> = ({ children }) => {
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products, updateProduct } = useProducts();
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();

  const refreshStockUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      let querySnapshot;
      
      if (currentLocation) {
        // If a location is selected, get all stock updates and filter client-side
        const q = query(
          collection(db, 'stockUpdates'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentLocation.id)
        };
      } else if (currentUser?.role === 'staff' && currentUser?.locationId) {
        // Staff can only see stock updates from their location
        const q = query(
          collection(db, 'stockUpdates'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'manager' && currentUser?.locationId) {
        // Manager can only see stock updates from their location
        const q = query(
          collection(db, 'stockUpdates'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'admin') {
        // Admin can see stock updates from all locations in their franchise
        if (currentUser?.franchiseId) {
          const q = query(
            collection(db, 'stockUpdates'),
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
          
          // Filter stock updates by franchise location IDs
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
        // Otherwise get all stock updates (for superadmin)
        const q = query(
          collection(db, 'stockUpdates'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      }
      
      const stockData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as StockUpdate[];
      
      setStockUpdates(stockData);
    } catch (err: any) {
      console.error('Error fetching stock updates:', err);
      setError(err.message || 'Failed to fetch stock updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStockUpdates();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  const addStockUpdate = async (data: StockUpdateFormData) => {
    setError(null);
    try {
      // Find the product
      const product = products.find(p => p.id === data.productId);
      if (!product) {
        throw new Error('Product not found');
      }

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

      // Verify product belongs to the current location
      if (product.locationId && product.locationId !== locationId) {
        throw new Error('You can only update stock for products in your location.');
      }

      // Update product quantity
      await updateProduct(product.id, {
        ...product,
        quantity: product.quantity + data.quantity
      });

      // Add stock update record
      await addDoc(collection(db, 'stockUpdates'), {
        ...data,
        locationId: locationId,
        createdBy: currentUser?.uid,
        createdAt: serverTimestamp()
      });
      
      await refreshStockUpdates();
    } catch (err: any) {
      console.error('Error adding stock update:', err);
      setError(err.message || 'Failed to update stock');
      throw err;
    }
  };

  const value: StockContextType = {
    stockUpdates,
    loading,
    error,
    addStockUpdate,
    refreshStockUpdates
  };

  return (
    <StockContext.Provider value={value}>
      {children}
    </StockContext.Provider>
  );
};