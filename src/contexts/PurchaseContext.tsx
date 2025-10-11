import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Purchase, PurchaseFormData } from '../types';
import { useProducts } from './ProductContext';
import { useLocations } from './LocationContext';
import { useAuth } from './AuthContext';

interface PurchaseContextType {
  purchases: Purchase[];
  loading: boolean;
  error: string | null;
  addPurchase: (data: PurchaseFormData) => Promise<void>;
  refreshPurchases: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export const usePurchases = () => {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
};

interface PurchaseProviderProps {
  children: ReactNode;
}

export const PurchaseProvider: React.FC<PurchaseProviderProps> = ({ children }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { products, updateProduct } = useProducts();
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();

  const refreshPurchases = async () => {
    setLoading(true);
    setError(null);
    try {
      let querySnapshot;
      
      if (currentLocation) {
        // If a location is selected, get all purchases and filter client-side
        const q = query(
          collection(db, 'purchases'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentLocation.id)
        };
      } else if (currentUser?.role === 'staff' && currentUser?.locationId) {
        // Staff can only see purchases from their location
        const q = query(
          collection(db, 'purchases'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'manager' && currentUser?.locationId) {
        // Manager can only see purchases from their location
        const q = query(
          collection(db, 'purchases'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        querySnapshot = {
          docs: allSnapshot.docs.filter(doc => doc.data().locationId === currentUser.locationId)
        };
      } else if (currentUser?.role === 'admin') {
        // Admin can see purchases from all locations in their franchise
        if (currentUser?.franchiseId) {
          const q = query(
            collection(db, 'purchases'),
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
          
          // Filter purchases by franchise location IDs
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
        // Otherwise get all purchases (for superadmin)
        const q = query(
          collection(db, 'purchases'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      }
      
      const purchasesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Purchase[];
      
      setPurchases(purchasesData);
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      setError(err.message || 'Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPurchases();
  }, [currentLocation, currentUser]);

  const addPurchase = async (data: PurchaseFormData) => {
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

      // Update product quantity
      await updateProduct(product.id, {
        ...product,
        quantity: product.quantity + data.quantity
      });

      // Add purchase record
      await addDoc(collection(db, 'purchases'), {
        ...data,
        productName: product.name,
        locationId: locationId,
        createdBy: currentUser?.uid,
        createdAt: serverTimestamp()
      });
      
      await refreshPurchases();
    } catch (err: any) {
      console.error('Error adding purchase:', err);
      setError(err.message || 'Failed to add purchase');
      throw err;
    }
  };

  const value: PurchaseContextType = {
    purchases,
    loading,
    error,
    addPurchase,
    refreshPurchases
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
};