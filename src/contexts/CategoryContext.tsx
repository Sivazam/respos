import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Category } from '../types';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { getDataFilter, hasNoLocationAssigned } from './BaseContext';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();

  const refreshCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user has location assigned
      if (hasNoLocationAssigned(currentUser)) {
        setError('No location assigned. Please contact administrator.');
        setCategories([]);
        setLoading(false);
        return;
      }

      // Build simple query to avoid composite indexes
      let q;
      
      if (currentUser?.role === 'superadmin') {
        // Superadmin sees all categories - simple query
        q = query(collection(db, 'categories'));
      } else if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
        // Admin sees categories from their franchise - simple query
        q = query(collection(db, 'categories'), where('franchiseId', '==', currentUser.franchiseId));
      } else {
        // Manager and Staff see categories from their location - simple query
        q = query(collection(db, 'categories'), where('locationId', '==', currentUser?.locationId));
      }

      const querySnapshot = await getDocs(q);

      const categoriesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }) as Category[];

      // Client-side filtering and sorting
      let filteredCategories = categoriesData;
      
      // Filter by location for admin users - they can see categories from all their franchise locations
      if (currentUser?.role === 'admin' && currentUser?.franchiseId) {
        // Get all locations for this admin's franchise
        const locationsQuery = query(
          collection(db, 'locations'),
          where('franchiseId', '==', currentUser.franchiseId)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const franchiseLocationIds = locationsSnapshot.docs.map(doc => doc.id);
        
        // Filter categories by franchise location IDs
        filteredCategories = filteredCategories.filter(cat => 
          franchiseLocationIds.includes(cat.locationId)
        );
      }
      
      // Sort by createdAt descending
      filteredCategories.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });

      setCategories(filteredCategories);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    
    try {
      // Check if user has location assigned
      if (hasNoLocationAssigned(currentUser)) {
        throw new Error('No location assigned. Please contact administrator.');
      }

      // Determine locationId and franchiseId
      let locationId = categoryData.locationId;
      let franchiseId = categoryData.franchiseId;

      if (!locationId) {
        if (currentLocation) {
          locationId = currentLocation.id;
          franchiseId = currentLocation.franchiseId;
        } else if (currentUser?.locationId) {
          locationId = currentUser.locationId;
          franchiseId = currentUser.franchiseId;
        }
      }

      if (!locationId || !franchiseId) {
        throw new Error('No location available. Please select a location or contact an administrator.');
      }

      if (!categoryData.name || !categoryData.name.trim()) {
        throw new Error('Category name is required');
      }

      const cleanedCategoryData = {
        name: categoryData.name.trim(),
        description: categoryData.description?.trim() || '',
        locationId,
        franchiseId,
        displayOrder: Number(categoryData.displayOrder) || 0,
        isActive: categoryData.isActive !== false,
        imageUrl: categoryData.imageUrl || ''
      };

      const docRef = await addDoc(collection(db, 'categories'), {
        ...cleanedCategoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newCategory = {
        id: docRef.id,
        ...cleanedCategoryData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await refreshCategories();
      return newCategory;
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.message || 'Failed to add category');
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setError(null);
    
    try {
      const categoryRef = doc(db, 'categories', id);
      
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

      await updateDoc(categoryRef, cleanedUpdates);
      await refreshCategories();
    } catch (err: any) {
      console.error('Error updating category:', err);
      setError(err.message || 'Failed to update category');
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    setError(null);
    
    try {
      await deleteDoc(doc(db, 'categories', id));
      await refreshCategories();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setError(err.message || 'Failed to delete category');
      throw err;
    }
  };

  const value: CategoryContextType = {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};