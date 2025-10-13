import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Franchise } from '../types';
import { useAuth } from './AuthContext';

interface FranchiseContextType {
  franchises: Franchise[];
  loading: boolean;
  error: string | null;
  addFranchise: (franchise: Omit<Franchise, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Franchise>;
  updateFranchise: (id: string, updates: Partial<Franchise>) => Promise<void>;
  deleteFranchise: (id: string) => Promise<void>;
  approveFranchise: (id: string) => Promise<void>;
  suspendFranchise: (id: string) => Promise<void>;
  refreshFranchises: () => Promise<void>;
}

const FranchiseContext = createContext<FranchiseContextType | null>(null);

export const useFranchises = () => {
  const context = useContext(FranchiseContext);
  if (!context) {
    throw new Error('useFranchises must be used within a FranchiseProvider');
  }
  return context;
};

interface FranchiseProviderProps {
  children: ReactNode;
}

export const FranchiseProvider: React.FC<FranchiseProviderProps> = ({ children }) => {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const refreshFranchises = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== FRANCHISES CONTEXT FETCH ===');
      console.log('Current user:', currentUser?.email, 'role:', currentUser?.role);

      let querySnapshot;
      
      if (currentUser?.role === 'superadmin') {
        // Superadmin sees all franchises
        console.log('Querying all franchises (superadmin)');
        const franchisesQuery = query(
          collection(db, 'franchises'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(franchisesQuery);
      } else if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
        // Admin/Owner sees only their franchise
        console.log('Querying franchise for user:', currentUser.franchiseId);
        // First get all franchises ordered by creation date
        const allFranchisesQuery = query(
          collection(db, 'franchises'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(allFranchisesQuery);
        
        // Then filter client-side by ID to avoid composite index
        const filteredDocs = allSnapshot.docs.filter(doc => 
          doc.id === currentUser.franchiseId
        );
        
        // Create a mock querySnapshot with filtered docs
        querySnapshot = { docs: filteredDocs };
      } else {
        // For unauthenticated users or other roles, show all franchises for registration
        // Super admin will approve/reject them later
        console.log('Querying all franchises for registration');
        const franchisesQuery = query(
          collection(db, 'franchises'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(franchisesQuery);
      }
      console.log('Franchises query completed, docs:', querySnapshot.docs.length);

      const franchisesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          approvedAt: data.approvedAt?.toDate()
        };
      }) as Franchise[];

      console.log('Final franchises count:', franchisesData.length);
      setFranchises(franchisesData);

    } catch (err: any) {
      console.error('Error fetching franchises:', err);
      setError(err.message || 'Failed to fetch franchises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFranchises();
  }, [currentUser?.uid, currentUser?.role]);

  const addFranchise = async (franchiseData: Omit<Franchise, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    
    try {
      // Only superadmin can add franchises
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can add franchises');
      }

      const cleanedFranchiseData = {
        name: franchiseData.name || 'Unknown Franchise',
        ownerName: franchiseData.ownerName || '',
        email: franchiseData.email || '',
        phone: franchiseData.phone || '',
        address: franchiseData.address || '',
        commissionRate: Number(franchiseData.commissionRate) || 0,
        plan: franchiseData.plan || 'basic',
        features: franchiseData.features || [],
        isApproved: franchiseData.isApproved !== false,
        isActive: franchiseData.isActive !== false,
        locations: [], // Start with empty locations array
        approvedAt: franchiseData.isApproved ? serverTimestamp() : null
      };

      const docRef = await addDoc(collection(db, 'franchises'), {
        ...cleanedFranchiseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newFranchise = {
        id: docRef.id,
        ...cleanedFranchiseData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await refreshFranchises();
      return newFranchise;
    } catch (err: any) {
      console.error('Error adding franchise:', err);
      setError(err.message || 'Failed to add franchise');
      throw err;
    }
  };

  const updateFranchise = async (id: string, updates: Partial<Franchise>) => {
    setError(null);
    
    try {
      const franchiseRef = doc(db, 'franchises', id);
      
      const cleanedUpdates = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      // Remove undefined values
      Object.keys(cleanedUpdates).forEach(key => {
        if (cleanedUpdates[key] === undefined) {
          delete cleanedUpdates[key];
        }
      });

      await updateDoc(franchiseRef, cleanedUpdates);
      await refreshFranchises();
    } catch (err: any) {
      console.error('Error updating franchise:', err);
      setError(err.message || 'Failed to update franchise');
      throw err;
    }
  };

  const deleteFranchise = async (id: string) => {
    setError(null);
    
    try {
      // Only superadmin can delete franchises
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can delete franchises');
      }

      // Check if franchise has locations
      const franchiseDoc = await getDoc(doc(db, 'franchises', id));
      if (franchiseDoc.exists()) {
        const franchiseData = franchiseDoc.data();
        if (franchiseData.locations && franchiseData.locations.length > 0) {
          throw new Error('Cannot delete franchise with existing locations. Please delete locations first.');
        }
      }

      await deleteDoc(doc(db, 'franchises', id));
      await refreshFranchises();
    } catch (err: any) {
      console.error('Error deleting franchise:', err);
      setError(err.message || 'Failed to delete franchise');
      throw err;
    }
  };

  const approveFranchise = async (id: string) => {
    setError(null);
    
    try {
      // Only superadmin can approve franchises
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can approve franchises');
      }

      const franchiseRef = doc(db, 'franchises', id);
      await updateDoc(franchiseRef, {
        isApproved: true,
        isActive: true,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      await refreshFranchises();
    } catch (err: any) {
      console.error('Error approving franchise:', err);
      setError(err.message || 'Failed to approve franchise');
      throw err;
    }
  };

  const suspendFranchise = async (id: string) => {
    setError(null);
    
    try {
      // Only superadmin can suspend franchises
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can suspend franchises');
      }

      const franchiseRef = doc(db, 'franchises', id);
      await updateDoc(franchiseRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      
      await refreshFranchises();
    } catch (err: any) {
      console.error('Error suspending franchise:', err);
      setError(err.message || 'Failed to suspend franchise');
      throw err;
    }
  };

  const value: FranchiseContextType = {
    franchises,
    loading,
    error,
    addFranchise,
    updateFranchise,
    deleteFranchise,
    approveFranchise,
    suspendFranchise,
    refreshFranchises
  };

  return (
    <FranchiseContext.Provider value={value}>
      {children}
    </FranchiseContext.Provider>
  );
};