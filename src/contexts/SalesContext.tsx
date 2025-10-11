import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Sale } from '../types';
import { format } from 'date-fns';
import { useLocations } from './LocationContext';
import { useAuth } from './AuthContext';

interface SalesContextType {
  sales: Sale[];
  loading: boolean;
  error: string | null;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'invoiceNumber'>) => Promise<Sale>;
  refreshSales: () => Promise<void>;
}

const SalesContext = createContext<SalesContextType | null>(null);

export const useSales = () => {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
};

interface SalesProviderProps {
  children: ReactNode;
}

export const SalesProvider: React.FC<SalesProviderProps> = ({ children }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();

  const refreshSales = async () => {
    setLoading(true);
    setError(null);
    
    // Don't fetch if no user is authenticated
    if (!currentUser) {
      setSales([]);
      setLoading(false);
      return;
    }
    
    try {
      let querySnapshot;
      
      // Use client-side filtering to avoid index requirements
      if (currentUser?.role === 'superadmin') {
        const q = query(
          collection(db, 'sales'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } else if (currentLocation) {
        const q = query(
          collection(db, 'sales'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        
        const filteredDocs = allSnapshot.docs.filter(doc => 
          doc.data().locationId === currentLocation.id
        );
        querySnapshot = { docs: filteredDocs };
      } else if (currentUser?.role === 'staff' && currentUser?.locationId) {
        const q = query(
          collection(db, 'sales'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        
        const filteredDocs = allSnapshot.docs.filter(doc => 
          doc.data().locationId === currentUser.locationId
        );
        querySnapshot = { docs: filteredDocs };
      } else if (currentUser?.role === 'manager' && currentUser?.locationId) {
        const q = query(
          collection(db, 'sales'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(q);
        
        const filteredDocs = allSnapshot.docs.filter(doc => 
          doc.data().locationId === currentUser.locationId
        );
        querySnapshot = { docs: filteredDocs };
      } else if (currentUser?.role === 'admin') {
        if (currentUser?.franchiseId) {
          const q = query(
            collection(db, 'sales'),
            orderBy('createdAt', 'desc')
          );
          const allSalesSnapshot = await getDocs(q);
          
          const locationsQuery = query(
            collection(db, 'locations'),
            where('franchiseId', '==', currentUser.franchiseId)
          );
          const locationsSnapshot = await getDocs(locationsQuery);
          const franchiseLocationIds = locationsSnapshot.docs.map(doc => doc.id);
          
          const filteredDocs = allSalesSnapshot.docs.filter(doc => 
            franchiseLocationIds.includes(doc.data().locationId)
          );
          
          querySnapshot = { docs: filteredDocs };
        } else {
          querySnapshot = { docs: [] };
        }
      } else {
        // For users without location assignment (manager without location, etc.), don't show any sales
        querySnapshot = { docs: [] };
      }
        
      const salesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()
        };
      }) as Sale[];
      
      setSales(salesData);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError(err.message || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSales();
  }, [currentLocation, currentUser]);

  const getNextInvoiceNumber = async () => {
    const counterRef = doc(db, 'counters', 'sales');
    const counterDoc = await getDoc(counterRef);
    
    let currentCount = 1;
    if (counterDoc.exists()) {
      currentCount = counterDoc.data().currentCount + 1;
    }
    
    await setDoc(counterRef, { currentCount });
    
    // Format: MHF-YYYYMMDD-XXXX
    const invoiceNumber = `MHF-${format(new Date(), 'yyyyMMdd')}-${String(currentCount).padStart(4, '0')}`;
    return invoiceNumber;
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'createdAt' | 'invoiceNumber'>) => {
    setError(null);
    try {
      const invoiceNumber = await getNextInvoiceNumber();
      
      // Determine the locationId to use
      let locationId = saleData.locationId;
      
      if (!locationId) {
        if (currentLocation) {
          locationId = currentLocation.id;
        } else if (currentUser?.locationId) {
          locationId = currentUser.locationId;
        }
      }
      
      if (!locationId && currentUser?.role !== 'superadmin') {
        throw new Error('No location available. Please select a location or contact an administrator.');
      }
      
      // Ensure all data is properly formatted and no undefined values
      const cleanedSaleData = {
        items: saleData.items.map(item => ({
          id: item.id || `temp_${Date.now()}_${Math.random()}`,
          menuItemId: item.menuItemId || item.id,
          name: item.name || 'Unknown Item',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          modifications: item.modifications || [],
          notes: item.notes || ''
        })),
        subtotal: Number(saleData.subtotal) || 0,
        cgst: Number(saleData.cgst) || 0,
        sgst: Number(saleData.sgst) || 0,
        total: Number(saleData.total) || 0,
        paymentMethod: saleData.paymentMethod || 'cash',
        createdBy: saleData.createdBy || 'unknown',
        locationId: locationId || 'default_location'
      };
      
      console.log('Cleaned sale data:', cleanedSaleData);
      
      const docRef = await addDoc(collection(db, 'sales'), {
        ...cleanedSaleData,
        invoiceNumber,
        createdAt: serverTimestamp()
      });
      
      const newSale = {
        id: docRef.id,
        ...cleanedSaleData,
        invoiceNumber,
        locationId,
        createdAt: new Date()
      };
      
      await refreshSales();
      return newSale;
    } catch (err: any) {
      console.error('Error adding sale:', err);
      setError(err.message || 'Failed to add sale');
      throw err;
    }
  };

  const value: SalesContextType = {
    sales,
    loading,
    error,
    addSale,
    refreshSales
  };

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
};