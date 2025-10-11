import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Location initial setup data interface
export interface LocationSetupData {
  tables: {
    count: number;
    types: TableType[];
  };
  staff: {
    maxCount: number;
    roles: string[];
  };
  operations: {
    orderTypes: string[];
    paymentMethods: string[];
    taxRates: {
      cgst: number;
      sgst: number;
    };
  };
  features: {
    tableManagement: boolean;
    inventory: boolean;
    reports: boolean;
    onlineOrders: boolean;
  };
}

export interface TableType {
  id: string;
  name: string;
  capacity: number;
  shape: 'round' | 'square' | 'rectangle';
  count: number;
}

export interface LocationSettings {
  id: string;
  locationId: string;
  tables: LocationSetupData['tables'];
  staff: LocationSetupData['staff'];
  operations: LocationSetupData['operations'];
  features: LocationSetupData['features'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Get default setup data
export const getDefaultSetupData = (): LocationSetupData => ({
  tables: {
    count: 10,
    types: [
      {
        id: 'table_2seater',
        name: '2 Seater',
        capacity: 2,
        shape: 'square',
        count: 4
      },
      {
        id: 'table_4seater',
        name: '4 Seater',
        capacity: 4,
        shape: 'square',
        count: 4
      },
      {
        id: 'table_6seater',
        name: '6 Seater',
        capacity: 6,
        shape: 'rectangle',
        count: 2
      }
    ]
  },
  staff: {
    maxCount: 15,
    roles: ['admin', 'manager', 'staff']
  },
  operations: {
    orderTypes: ['dinein', 'takeaway'],
    paymentMethods: ['cash', 'card', 'upi'],
    taxRates: {
      cgst: 0,
      sgst: 0
    }
  },
  features: {
    tableManagement: true,
    inventory: true,
    reports: true,
    onlineOrders: false
  }
});

// Copy menu categories and items from source location to target location
export const copyMenuFromLocation = async (
  sourceLocationId: string,
  targetLocationId: string,
  franchiseId: string
) => {
  try {
    console.log('📋 Copying menu from location:', sourceLocationId, 'to:', targetLocationId);
    
    // Get menu categories from source location
    const categoriesQuery = query(
      collection(db, 'categories'),
      where('locationId', '==', sourceLocationId)
    );
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    // Get menu items from source location
    const menuItemsQuery = query(
      collection(db, 'menuItems'),
      where('locationId', '==', sourceLocationId)
    );
    const menuItemsSnapshot = await getDocs(menuItemsQuery);
    
    const batch = writeBatch(db);
    const categoryMap: { [key: string]: string } = {};
    
    // Copy categories
    categoriesSnapshot.forEach((categoryDoc) => {
      const categoryData = categoryDoc.data();
      const newCategoryRef = doc(collection(db, 'categories'));
      
      const newCategoryData = {
        ...categoryData,
        locationId: targetLocationId,
        restaurantId: franchiseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      batch.set(newCategoryRef, newCategoryData);
      categoryMap[categoryDoc.id] = newCategoryRef.id;
    });
    
    // Copy menu items
    menuItemsSnapshot.forEach((menuItemDoc) => {
      const menuItemData = menuItemDoc.data();
      const newMenuItemRef = doc(collection(db, 'menuItems'));
      
      const newMenuItemData = {
        ...menuItemData,
        locationId: targetLocationId,
        restaurantId: franchiseId,
        categoryId: categoryMap[menuItemData.categoryId] || menuItemData.categoryId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      batch.set(newMenuItemRef, newMenuItemData);
    });
    
    await batch.commit();
    console.log('✅ Menu copied successfully');
    
    return {
      categoriesCopied: categoriesSnapshot.size,
      menuItemsCopied: menuItemsSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Error copying menu:', error);
    throw error;
  }
};

// Copy default settings from source location
export const copySettingsFromLocation = async (
  sourceLocationId: string,
  targetLocationId: string
) => {
  try {
    console.log('⚙️ Copying settings from location:', sourceLocationId, 'to:', targetLocationId);
    
    // Get settings from source location
    const settingsDoc = await getDoc(doc(db, 'locationSettings', sourceLocationId));
    
    if (settingsDoc.exists()) {
      const settingsData = settingsDoc.data();
      const newSettingsRef = doc(db, 'locationSettings', targetLocationId);
      
      const newSettingsData = {
        ...settingsData,
        locationId: targetLocationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newSettingsRef, newSettingsData);
      console.log('✅ Settings copied successfully');
      
      return settingsData;
    } else {
      console.log('⚠️ No settings found in source location, using defaults');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error copying settings:', error);
    throw error;
  }
};

// Create initial location settings
export const createLocationSettings = async (
  locationId: string,
  setupData: LocationSetupData
) => {
  try {
    console.log('🏗️ Creating initial settings for location:', locationId);
    
    const settingsRef = doc(db, 'locationSettings', locationId);
    const settingsData: LocationSettings = {
      id: locationId,
      locationId,
      ...setupData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await setDoc(settingsRef, settingsData);
    console.log('✅ Initial settings created successfully');
    
    return settingsData;
    
  } catch (error) {
    console.error('❌ Error creating location settings:', error);
    throw error;
  }
};

// Create tables based on setup data
export const createTablesFromSetup = async (
  locationId: string,
  franchiseId: string,
  tableTypes: TableType[]
) => {
  try {
    console.log('🪑 Creating tables for location:', locationId);
    
    const batch = writeBatch(db);
    let tableNumber = 1;
    
    tableTypes.forEach((tableType) => {
      for (let i = 0; i < tableType.count; i++) {
        const tableRef = doc(collection(db, 'tables'));
        const tableData = {
          number: `T${tableNumber.toString().padStart(2, '0')}`,
          restaurantId: franchiseId,
          locationId,
          capacity: tableType.capacity,
          status: 'available',
          position: { 
            x: (tableNumber % 4) * 150 + 50, 
            y: Math.floor(tableNumber / 4) * 150 + 50 
          },
          shape: tableType.shape,
          section: 'main',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(tableRef, tableData);
        tableNumber++;
      }
    });
    
    await batch.commit();
    console.log('✅ Tables created successfully');
    
    return tableNumber - 1; // Return total tables created
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Get default location for a franchise
export const getDefaultLocation = async (franchiseId: string) => {
  try {
    const locationsQuery = query(
      collection(db, 'locations'),
      where('franchiseId', '==', franchiseId),
      where('isActive', '==', true)
    );
    const locationsSnapshot = await getDocs(locationsQuery);
    
    if (locationsSnapshot.empty) {
      throw new Error('No active locations found for this franchise');
    }
    
    // Return the first location (should be the default/main location)
    return {
      id: locationsSnapshot.docs[0].id,
      ...locationsSnapshot.docs[0].data()
    };
    
  } catch (error) {
    console.error('❌ Error getting default location:', error);
    throw error;
  }
};

// Check if user has completed initial setup
export const checkUserSetupStatus = async (userId: string, locationId: string) => {
  try {
    const setupDoc = await getDoc(doc(db, 'userSetupStatus', userId));
    
    if (setupDoc.exists()) {
      const setupData = setupDoc.data();
      return setupData.completedLocations?.includes(locationId) || false;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error checking setup status:', error);
    return false;
  }
};

// Mark user setup as completed for a location
export const markUserSetupCompleted = async (userId: string, locationId: string) => {
  try {
    const setupRef = doc(db, 'userSetupStatus', userId);
    const setupDoc = await getDoc(setupRef);
    
    if (setupDoc.exists()) {
      const setupData = setupDoc.data();
      const completedLocations = setupData.completedLocations || [];
      
      await setDoc(setupRef, {
        ...setupData,
        completedLocations: [...completedLocations, locationId],
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(setupRef, {
        userId,
        completedLocations: [locationId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    console.log('✅ User setup marked as completed for location:', locationId);
    
  } catch (error) {
    console.error('❌ Error marking setup completed:', error);
    throw error;
  }
};