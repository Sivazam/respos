import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Location } from '../types';
import { useAuth } from './AuthContext';
import { canUserAccessLocation, hasNoLocationAssigned } from './BaseContext';

interface LocationContextType {
  locations: Location[];
  currentLocation: Location | null;
  loading: boolean;
  error: string | null;
  setCurrentLocation: (location: Location | null) => void;
  addLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Location>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | null>(null);

export const useLocations = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const refreshLocations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('=== LOCATIONS CONTEXT FETCH ===');
      console.log('Current user:', currentUser?.email, 'role:', currentUser?.role);

      let querySnapshot;
      
      if (currentUser?.role === 'superadmin') {
        // Superadmin sees all locations
        console.log('Querying all locations (superadmin)');
        const locationsQuery = query(
          collection(db, 'locations'),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(locationsQuery);
      } else if (currentUser?.role === 'admin' || currentUser?.role === 'owner') {
        // Admin/Owner sees all locations in their franchise
        console.log('Querying locations for franchise:', currentUser.franchiseId);
        // First get all locations ordered by creation date
        const allLocationsQuery = query(
          collection(db, 'locations'),
          orderBy('createdAt', 'desc')
        );
        const allSnapshot = await getDocs(allLocationsQuery);
        
        // Then filter client-side by franchiseId to avoid composite index
        const filteredDocs = allSnapshot.docs.filter(doc => 
          doc.data().franchiseId === currentUser.franchiseId
        );
        
        // Create a mock querySnapshot with filtered docs
        querySnapshot = { docs: filteredDocs };
      } else if (currentUser?.role === 'manager' || currentUser?.role === 'staff') {
        // Manager/Staff sees only their assigned location
        console.log('Querying location for user:', currentUser.locationId);
        if (!currentUser.locationId) {
          console.log('No locationId assigned to user');
          setLocations([]);
          setLoading(false);
          return;
        }
        
        // For manager/staff, we need to fetch the specific location document
        // since querying by document ID doesn't work with where clause
        try {
          const locationDoc = await getDoc(doc(db, 'locations', currentUser.locationId));
          if (locationDoc.exists()) {
            const locationData = {
              id: locationDoc.id,
              ...locationDoc.data(),
              createdAt: locationDoc.data().createdAt?.toDate(),
              updatedAt: locationDoc.data().updatedAt?.toDate()
            } as Location;
            console.log('Found location for user:', locationData.name);
            setLocations([locationData]);
            setCurrentLocation(locationData);
          } else {
            console.log('Location document not found:', currentUser.locationId);
            setLocations([]);
          }
        } catch (error) {
          console.error('Error fetching location document:', error);
          setLocations([]);
        }
        setLoading(false);
        return;
      } else {
        // No user or unknown role
        console.log('No user or unknown role, returning empty locations');
        setLocations([]);
        setLoading(false);
        return;
      }

      console.log('Locations query completed, docs:', querySnapshot.docs.length);

      const locationsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
      }) as Location[];

      console.log('Final locations count:', locationsData.length);
      setLocations(locationsData);

      // Auto-select first location if no current location
      if (!currentLocation && locationsData.length > 0) {
        console.log('Auto-selecting first location:', locationsData[0].name);
        setCurrentLocation(locationsData[0]);
      }

    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.message || 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLocations();
  }, [currentUser?.uid, currentUser?.role, currentUser?.franchiseId, currentUser?.locationId]);

  const addLocation = async (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null);
    
    try {
      // Only superadmin can add locations
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can add locations');
      }

      const cleanedLocationData = {
        name: locationData.name || 'Unknown Location',
        storeName: locationData.storeName || locationData.name,
        address: locationData.address || '',
        phone: locationData.phone || '',
        email: locationData.email || '',
        franchiseId: locationData.franchiseId,
        gstNumber: locationData.gstNumber || '',
        isActive: locationData.isActive !== false,
        isApproved: locationData.isApproved !== false,
        approvedAt: locationData.isApproved ? serverTimestamp() : null
      };

      const docRef = await addDoc(collection(db, 'locations'), {
        ...cleanedLocationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newLocation = {
        id: docRef.id,
        ...cleanedLocationData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update franchise with new location
      if (locationData.franchiseId) {
        const franchiseRef = doc(db, 'franchises', locationData.franchiseId);
        const franchiseDoc = await getDoc(franchiseRef);
        
        if (franchiseDoc.exists()) {
          const franchiseData = franchiseDoc.data();
          const currentLocations = franchiseData.locations || [];
          await updateDoc(franchiseRef, {
            locations: [...currentLocations, docRef.id],
            updatedAt: serverTimestamp()
          });
        }

        // Auto-update Admin/Owner users with the new location
        try {
          console.log(`Auto-updating Admin/Owner users for franchise ${locationData.franchiseId} with new location ${docRef.id}`);
          
          // Find all Admin/Owner users in this franchise
          const usersQuery = query(
            collection(db, 'users'),
            where('franchiseId', '==', locationData.franchiseId)
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          // Client-side filtering for role to avoid index requirement
          const filteredDocs = usersSnapshot.docs.filter(doc => 
            ['admin', 'owner'].includes(doc.data().role)
          );
          
          // Update each Admin/Owner user to include the new location
          const updatePromises = filteredDocs.map(async (userDoc) => {
            const userRef = doc(db, 'users', userDoc.id);
            const userData = userDoc.data();
            
            // Get current locationIds array or initialize empty array
            const currentLocationIds = userData.locationIds || [];
            
            // Add the new location if not already present
            if (!currentLocationIds.includes(docRef.id)) {
              const updatedLocationIds = [...currentLocationIds, docRef.id];
              
              await updateDoc(userRef, {
                locationIds: updatedLocationIds,
                updatedAt: serverTimestamp()
              });
              
              console.log(`Updated user ${userDoc.id} (${userData.email}) with new location ${docRef.id}`);
            }
          });
          
          await Promise.all(updatePromises);
          console.log(`Successfully updated ${usersSnapshot.size} Admin/Owner users with new location`);
        } catch (updateError) {
          console.warn('Could not auto-update Admin/Owner users with new location:', updateError);
          // Don't fail the location creation for user update errors
        }
      }

      await refreshLocations();
      return newLocation;
    } catch (err: any) {
      console.error('Error adding location:', err);
      setError(err.message || 'Failed to add location');
      throw err;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    setError(null);
    
    try {
      const locationRef = doc(db, 'locations', id);
      
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

      await updateDoc(locationRef, cleanedUpdates);
      await refreshLocations();
    } catch (err: any) {
      console.error('Error updating location:', err);
      setError(err.message || 'Failed to update location');
      throw err;
    }
  };

  const deleteLocation = async (id: string) => {
    setError(null);
    
    try {
      // Only superadmin can delete locations
      if (currentUser?.role !== 'superadmin') {
        throw new Error('Only superadmin can delete locations');
      }

      // Ensure id is a string
      const locationId = String(id);
      console.log('Deleting location with ID:', locationId, 'Type:', typeof locationId);

      // Get location to find franchise
      console.log('Fetching location document...');
      const locationDoc = await getDoc(doc(db, 'locations', locationId));
      
      if (locationDoc.exists()) {
        const locationData = locationDoc.data();
        console.log('Location data:', locationData);
        
        // Remove location from franchise
        if (locationData.franchiseId) {
          console.log('Location has franchiseId:', locationData.franchiseId, 'Type:', typeof locationData.franchiseId);
          
          try {
            const franchiseId = String(locationData.franchiseId);
            console.log('Creating franchise reference with ID:', franchiseId);
            const franchiseRef = doc(db, 'franchises', franchiseId);
            const franchiseDoc = await getDoc(franchiseRef);
            
            if (franchiseDoc.exists()) {
              const franchiseData = franchiseDoc.data();
              const currentLocations = franchiseData.locations || [];
              console.log('Current locations in franchise:', currentLocations);
              console.log('Filtering out location ID:', locationId);
              
              await updateDoc(franchiseRef, {
                locations: currentLocations.filter((locId: any) => String(locId) !== locationId),
                updatedAt: serverTimestamp()
              });
            } else {
              console.log('Franchise document does not exist');
            }
          } catch (franchiseError) {
            console.error('Error processing franchise:', franchiseError);
            // Continue with location deletion even if franchise update fails
          }

          // Remove location from Admin/Owner users
          try {
            console.log(`Removing location ${locationId} from Admin/Owner users in franchise ${locationData.franchiseId}`);
            
            // Find all Admin/Owner users in this franchise
            const usersQuery = query(
              collection(db, 'users'),
              where('franchiseId', '==', locationData.franchiseId)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            // Client-side filtering for role to avoid index requirement
            const filteredDocs = usersSnapshot.docs.filter(doc => 
              ['admin', 'owner'].includes(doc.data().role)
            );
            
            // Update each Admin/Owner user to remove the deleted location
            const updatePromises = filteredDocs.map(async (userDoc) => {
              const userRef = doc(db, 'users', userDoc.id);
              const userData = userDoc.data();
              
              // Get current locationIds array
              const currentLocationIds = userData.locationIds || [];
              
              // Remove the deleted location if present
              if (currentLocationIds.includes(locationId)) {
                const updatedLocationIds = currentLocationIds.filter(locId => locId !== locationId);
                
                await updateDoc(userRef, {
                  locationIds: updatedLocationIds,
                  updatedAt: serverTimestamp()
                });
                
                console.log(`Removed location ${locationId} from user ${userDoc.id} (${userData.email})`);
              }
            });
            
            await Promise.all(updatePromises);
            console.log(`Successfully removed location ${locationId} from ${usersSnapshot.size} Admin/Owner users`);
          } catch (updateError) {
            console.warn('Could not remove location from Admin/Owner users:', updateError);
            // Don't fail the location deletion for user update errors
          }
        } else {
          console.log('Location has no franchiseId, skipping franchise update');
        }
      } else {
        console.log('Location document does not exist');
      }

      console.log('Deleting location document...');
      await deleteDoc(doc(db, 'locations', locationId));
      
      // Clear current location if it was deleted
      if (currentLocation?.id === locationId) {
        setCurrentLocation(null);
      }
      
      await refreshLocations();
      console.log('Location deleted successfully');
    } catch (err: any) {
      console.error('Error deleting location:', err);
      setError(err.message || 'Failed to delete location');
      throw err;
    }
  };

  const value: LocationContextType = {
    locations,
    currentLocation,
    loading,
    error,
    setCurrentLocation,
    addLocation,
    updateLocation,
    deleteLocation,
    refreshLocations
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};