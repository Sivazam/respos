import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Product, ProductFormData } from '../types';
import { useLocations } from './LocationContext';
import { useAuth } from './AuthContext';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  error: string | null;
  addProduct: (data: ProductFormData) => Promise<void>;
  updateProduct: (id: string, data: ProductFormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | null>(null);

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();

  const refreshProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      let q;
      
      if (currentLocation) {
        // If a location is selected, get products for that location
        q = query(
          collection(db, 'products'),
          where('locationId', '==', currentLocation.id)
        );
      } else if (currentUser?.role === 'staff' && currentUser?.locationId) {
        // Staff can only see products from their location
        q = query(
          collection(db, 'products'),
          where('locationId', '==', currentUser.locationId)
        );
      } else if (currentUser?.role === 'manager' && currentUser?.locationId) {
        // Manager can only see products from their location
        q = query(
          collection(db, 'products'),
          where('locationId', '==', currentUser.locationId)
        );
      } else if (currentUser?.role === 'admin') {
        // Admin can see products from all locations in their franchise
        if (currentUser?.franchiseId) {
          // Get all products first, then filter by franchise locations
          q = query(collection(db, 'products'));
          const allSnapshot = await getDocs(q);
          
          // Get all locations for this admin's franchise
          const locationsQuery = query(
            collection(db, 'locations'),
            where('franchiseId', '==', currentUser.franchiseId)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          const franchiseLocationIds = locationsSnapshot.docs.map(doc => doc.id);
          
          // Filter products by franchise location IDs
          const filteredDocs = allSnapshot.docs.filter(doc => 
            franchiseLocationIds.includes(doc.data().locationId)
          );
          
          const productsData = filteredDocs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate()
          })) as Product[];
          
          // Sort products by name on the client side
          productsData.sort((a, b) => a.name.localeCompare(b.name));
          
          setProducts(productsData);
          setLoading(false);
          return;
        } else {
          // Admin without franchiseId - no access
          setProducts([]);
          setLoading(false);
          return;
        }
      } else {
        // For superadmin or admin without location selected, get all products
        q = query(collection(db, 'products'));
      }
      
      const querySnapshot = await getDocs(q);
      
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Product[];
      
      // Sort products by name on the client side instead of in the query
      productsData.sort((a, b) => a.name.localeCompare(b.name));
      
      setProducts(productsData);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  const addProduct = async (data: ProductFormData) => {
    setError(null);
    try {
      // Determine the locationId to use
      let locationId = null;
      
      if (currentLocation) {
        locationId = currentLocation.id;
      } else if (currentUser?.locationId) {
        locationId = currentUser.locationId;
      }
      
      if (!locationId && (currentUser?.role !== 'superadmin')) {
        throw new Error('No location available. Please select a location or contact an administrator.');
      }
      
      const docRef = await addDoc(collection(db, 'products'), {
        ...data,
        quantity: 0, // New products start with 0 quantity
        locationId: locationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await refreshProducts();
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || 'Failed to add product');
      throw err;
    }
  };

  const updateProduct = async (id: string, data: ProductFormData) => {
    setError(null);
    try {
      const productRef = doc(db, 'products', id);
      await updateDoc(productRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      
      await refreshProducts();
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    setError(null);
    try {
      await deleteDoc(doc(db, 'products', id));
      await refreshProducts();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  };

  const value: ProductContextType = {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};