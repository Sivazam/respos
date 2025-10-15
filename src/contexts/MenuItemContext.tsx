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
import { MenuItem } from '../types';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { getDataFilter, hasNoLocationAssigned } from './BaseContext';

interface MenuItemContextType {
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MenuItem>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  refreshMenuItems: () => Promise<void>;
  getMenuItemsForLocation: (locationId?: string) => MenuItem[];
}

const MenuItemContext = createContext<MenuItemContextType | null>(null);

export const useMenuItems = () => {
  const context = useContext(MenuItemContext);
  if (!context) {
    throw new Error('useMenuItems must be used within a MenuItemProvider');
  }
  return context;
};

interface MenuItemProviderProps {
  children: ReactNode;
}

export const MenuItemProvider: React.FC<MenuItemProviderProps> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { currentLocation, locations } = useLocations();

  const refreshMenuItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if user has location assigned
      if (hasNoLocationAssigned(currentUser)) {
        setError('No location assigned. Please contact administrator.');
        setMenuItems([]);
        setLoading(false);
        return;
      }

      // Build simple query to avoid composite indexes
      let q;
      
      if (currentUser?.role === 'superadmin') {
        // Superadmin sees all menu items - simple query
        q = query(collection(db, 'menuItems'));
      } else if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
        // Admin sees menu items from their franchise - simple query
        q = query(collection(db, 'menuItems'), where('franchiseId', '==', currentUser.franchiseId));
      } else {
        // Manager and Staff see menu items from their location - simple query
        q = query(collection(db, 'menuItems'), where('locationId', '==', currentUser?.locationId));
      }

      const querySnapshot = await getDocs(q);

      const menuItemsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }) as MenuItem[];

      // Client-side filtering and sorting
      let filteredMenuItems = menuItemsData;
      
      // Filter by location for admin users - they can see menu items from all their franchise locations
      if (currentUser?.role === 'admin' && currentUser?.franchiseId) {
        // Get all locations for this admin's franchise
        const locationsQuery = query(
          collection(db, 'locations'),
          where('franchiseId', '==', currentUser.franchiseId)
        );
        const locationsSnapshot = await getDocs(locationsQuery);
        const franchiseLocationIds = locationsSnapshot.docs.map(doc => doc.id);
        
        // Filter menu items by franchise location IDs
        filteredMenuItems = filteredMenuItems.filter(item => 
          franchiseLocationIds.includes(item.locationId)
        );
      }
      
      // Sort by createdAt descending
      filteredMenuItems.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });

      setMenuItems(filteredMenuItems);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMenuItems();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  const addMenuItem = async (itemData: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    
    try {
      // Check if user has location assigned
      if (hasNoLocationAssigned(currentUser)) {
        throw new Error('No location assigned. Please contact administrator.');
      }

      // Determine locationId and franchiseId
      let locationId = itemData.locationId;
      let franchiseId = itemData.franchiseId;

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

      const cleanedItemData = {
        name: itemData.name || 'Unknown Item',
        description: itemData.description || '',
        price: Number(itemData.price) || 0,
        categoryId: itemData.categoryId || '',
        locationId,
        franchiseId,
        isAvailable: itemData.isAvailable !== false,
        isVegetarian: itemData.isVegetarian !== false,
        spiceLevel: itemData.spiceLevel || 'medium',
        preparationTime: Number(itemData.preparationTime) || 15,
        imageUrl: itemData.imageUrl || '',
        ingredients: itemData.ingredients || [],
        allergens: itemData.allergens || [],
        modifications: itemData.modifications || [],
        hasHalfPortion: itemData.hasHalfPortion || false,
        halfPortionCost: itemData.hasHalfPortion ? Number(itemData.halfPortionCost) || 0 : null
      };

      const docRef = await addDoc(collection(db, 'menuItems'), {
        ...cleanedItemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newItem = {
        id: docRef.id,
        ...cleanedItemData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await refreshMenuItems();
      return newItem;
    } catch (err: any) {
      console.error('Error adding menu item:', err);
      setError(err.message || 'Failed to add menu item');
      throw err;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    setError(null);
    
    try {
      const itemRef = doc(db, 'menuItems', id);
      
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

      await updateDoc(itemRef, cleanedUpdates);
      await refreshMenuItems();
    } catch (err: any) {
      console.error('Error updating menu item:', err);
      setError(err.message || 'Failed to update menu item');
      throw err;
    }
  };

  const deleteMenuItem = async (id: string) => {
    setError(null);
    
    try {
      await deleteDoc(doc(db, 'menuItems', id));
      await refreshMenuItems();
    } catch (err: any) {
      console.error('Error deleting menu item:', err);
      setError(err.message || 'Failed to delete menu item');
      throw err;
    }
  };

  const getMenuItemsForLocation = (locationId?: string) => {
    if (!locationId) {
      // If no locationId provided, return menu items based on user role
      if (currentUser?.role === 'superadmin') {
        return menuItems;
      } else if (currentUser?.role === 'admin' && currentUser?.franchiseId) {
        // For admin, get menu items from all their franchise locations
        const franchiseLocationIds = locations
          .filter(loc => loc.franchiseId === currentUser.franchiseId)
          .map(loc => loc.id);
        return menuItems.filter(item => franchiseLocationIds.includes(item.locationId));
      } else {
        return menuItems.filter(item => item.locationId === currentUser?.locationId);
      }
    }
    
    // Return menu items for specific location
    return menuItems.filter(item => item.locationId === locationId);
  };

  const value: MenuItemContextType = {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refreshMenuItems,
    getMenuItemsForLocation
  };

  return (
    <MenuItemContext.Provider value={value}>
      {children}
    </MenuItemContext.Provider>
  );
};