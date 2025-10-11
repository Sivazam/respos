import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Restaurant, RestaurantFormData, User } from '../types';

interface RestaurantContextType {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  fetchRestaurants: () => Promise<void>;
  addRestaurant: (restaurantData: RestaurantFormData, ownerId: string) => Promise<Restaurant>;
  updateRestaurant: (id: string, restaurantData: Partial<RestaurantFormData>) => Promise<void>;
  deleteRestaurant: (id: string) => Promise<void>;
  approveRestaurant: (id: string) => Promise<void>;
  deactivateRestaurant: (id: string) => Promise<void>;
  setCurrentRestaurant: (restaurant: Restaurant | null) => void;
  getRestaurantById: (id: string) => Promise<Restaurant | null>;
  getRestaurantsByOwner: (ownerId: string) => Promise<Restaurant[]>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

interface RestaurantProviderProps {
  children: ReactNode;
}

export const RestaurantProvider: React.FC<RestaurantProviderProps> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const restaurantList: Restaurant[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        approvedAt: doc.data().approvedAt?.toDate() || undefined,
      })) as Restaurant[];
      setRestaurants(restaurantList);
    } catch (err) {
      setError('Failed to fetch restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const addRestaurant = async (restaurantData: RestaurantFormData, ownerId: string): Promise<Restaurant> => {
    try {
      const docRef = await addDoc(collection(db, 'restaurants'), {
        ...restaurantData,
        ownerId,
        isApproved: false,
        isActive: false,
        settings: {
          maxTables: 15,
          maxStaff: 10,
          taxRates: {
            cgst: 2.5,
            sgst: 2.5,
          },
          orderTypes: ['dinein', 'takeaway'],
          features: {
            tableManagement: true,
            onlineOrders: false,
            thermalPrinting: false,
            offlineMode: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newRestaurant = {
        id: docRef.id,
        ...restaurantData,
        ownerId,
        isApproved: false,
        isActive: false,
        settings: {
          maxTables: 15,
          maxStaff: 10,
          taxRates: {
            cgst: 2.5,
            sgst: 2.5,
          },
          orderTypes: ['dinein', 'takeaway'],
          features: {
            tableManagement: true,
            onlineOrders: false,
            thermalPrinting: false,
            offlineMode: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setRestaurants(prev => [newRestaurant, ...prev]);
      return newRestaurant;
    } catch (err) {
      setError('Failed to add restaurant');
      console.error('Error adding restaurant:', err);
      throw err;
    }
  };

  const updateRestaurant = async (id: string, restaurantData: Partial<RestaurantFormData>) => {
    try {
      const docRef = doc(db, 'restaurants', id);
      await updateDoc(docRef, {
        ...restaurantData,
        updatedAt: new Date(),
      });
      
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.id === id 
            ? { ...restaurant, ...restaurantData, updatedAt: new Date() }
            : restaurant
        )
      );
    } catch (err) {
      setError('Failed to update restaurant');
      console.error('Error updating restaurant:', err);
      throw err;
    }
  };

  const deleteRestaurant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'restaurants', id));
      setRestaurants(prev => prev.filter(restaurant => restaurant.id !== id));
      if (currentRestaurant?.id === id) {
        setCurrentRestaurant(null);
      }
    } catch (err) {
      setError('Failed to delete restaurant');
      console.error('Error deleting restaurant:', err);
      throw err;
    }
  };

  const approveRestaurant = async (id: string) => {
    try {
      const docRef = doc(db, 'restaurants', id);
      await updateDoc(docRef, {
        isApproved: true,
        isActive: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      });
      
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.id === id 
            ? { 
                ...restaurant, 
                isApproved: true, 
                isActive: true, 
                approvedAt: new Date(),
                updatedAt: new Date() 
              }
            : restaurant
        )
      );
    } catch (err) {
      setError('Failed to approve restaurant');
      console.error('Error approving restaurant:', err);
      throw err;
    }
  };

  const deactivateRestaurant = async (id: string) => {
    try {
      const docRef = doc(db, 'restaurants', id);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date(),
      });
      
      setRestaurants(prev => 
        prev.map(restaurant => 
          restaurant.id === id 
            ? { ...restaurant, isActive: false, updatedAt: new Date() }
            : restaurant
        )
      );
    } catch (err) {
      setError('Failed to deactivate restaurant');
      console.error('Error deactivating restaurant:', err);
      throw err;
    }
  };

  const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
    try {
      const docRef = doc(db, 'restaurants', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate() || undefined,
        } as Restaurant;
      }
      return null;
    } catch (err) {
      console.error('Error getting restaurant:', err);
      throw err;
    }
  };

  const getRestaurantsByOwner = async (ownerId: string): Promise<Restaurant[]> => {
    try {
      const q = query(
        collection(db, 'restaurants'), 
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        approvedAt: doc.data().approvedAt?.toDate() || undefined,
      })) as Restaurant[];
    } catch (err) {
      console.error('Error getting restaurants by owner:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const value: RestaurantContextType = {
    restaurants,
    currentRestaurant,
    loading,
    error,
    fetchRestaurants,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    approveRestaurant,
    deactivateRestaurant,
    setCurrentRestaurant,
    getRestaurantById,
    getRestaurantsByOwner,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};