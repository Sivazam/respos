import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface TableBatchData {
  name: string;
  capacity: number;
  shape: 'round' | 'square' | 'rectangle';
  status: 'available' | 'occupied' | 'reserved';
  locationId: string;
}

export interface LocationSettingsData {
  locationId: string;
  orderTypes: {
    dineIn: boolean;
    takeaway: boolean;
  };
  paymentMethods: {
    cash: boolean;
    card: boolean;
    upi: boolean;
  };
  tax: {
    cgst: number;
    sgst: number;
  };
  maxEmployees: number;
  tables?: {
    totalTables: number;
    indoorTables: number;
    outdoorTables: number;
  };
  operations?: {
    prepTime: number;
    autoAcceptOrders: boolean;
    enableKot: boolean;
  };
  menu?: {
    categories: string[];
    enableSpiceLevels: boolean;
    enableCustomization: boolean;
  };
  enabledRoles: {
    admin: boolean;
    manager: boolean;
    employee: boolean;
  };
  enabledFeatures: {
    inventory: boolean;
    reports: boolean;
    analytics: boolean;
    onlineOrders: boolean;
    reservations: boolean;
  };
}

export class SetupService {
  // Create tables in batch
  static async createTablesBatch(tables: TableBatchData[]) {
    try {
      if (!Array.isArray(tables) || tables.length === 0) {
        throw new Error('Invalid tables data');
      }

      // Validate each table
      for (const table of tables) {
        if (!table.name || !table.capacity || !table.locationId) {
          throw new Error('Each table must have name, capacity, and locationId');
        }
      }

      // Create tables in batch
      const createdTables = await Promise.all(
        tables.map(table =>
          setDoc(doc(collection(db, 'tables')), {
            name: table.name,
            capacity: table.capacity,
            shape: table.shape || 'square',
            status: table.status || 'available',
            locationId: table.locationId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
        )
      );

      return {
        success: true,
        message: 'Tables created successfully',
        tables: createdTables
      };

    } catch (error) {
      console.error('Error creating tables:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tables'
      };
    }
  }

  // Create location settings
  static async createLocationSettings(settings: LocationSettingsData) {
    try {
      // Sanitize settings to remove any undefined values
      const sanitizedSettings = {
        locationId: settings.locationId,
        orderTypes: {
          dineIn: settings.orderTypes?.dineIn ?? true,
          takeaway: settings.orderTypes?.takeaway ?? true
        },
        paymentMethods: {
          cash: settings.paymentMethods?.cash ?? true,
          card: settings.paymentMethods?.card ?? true,
          upi: settings.paymentMethods?.upi ?? false
        },
        tax: {
          cgst: settings.tax?.cgst ?? 0,
          sgst: settings.tax?.sgst ?? 0
        },
        maxEmployees: settings.maxEmployees ?? 10,
        tables: settings.tables ? {
          totalTables: settings.tables.totalTables ?? 20,
          indoorTables: settings.tables.indoorTables ?? 15,
          outdoorTables: settings.tables.outdoorTables ?? 5
        } : {
          totalTables: 20,
          indoorTables: 15,
          outdoorTables: 5
        },
        operations: settings.operations ? {
          prepTime: settings.operations.prepTime ?? 15,
          autoAcceptOrders: settings.operations.autoAcceptOrders ?? false,
          enableKot: settings.operations.enableKot ?? true
        } : {
          prepTime: 15,
          autoAcceptOrders: false,
          enableKot: true
        },
        menu: settings.menu ? {
          categories: settings.menu.categories ?? ['appetizers', 'maincourse', 'desserts', 'beverages'],
          enableSpiceLevels: settings.menu.enableSpiceLevels ?? true,
          enableCustomization: settings.menu.enableCustomization ?? true
        } : {
          categories: ['appetizers', 'maincourse', 'desserts', 'beverages'],
          enableSpiceLevels: true,
          enableCustomization: true
        },
        enabledRoles: settings.enabledRoles ?? { admin: true, manager: true, employee: true },
        enabledFeatures: settings.enabledFeatures ?? { 
          inventory: true, 
          reports: true, 
          analytics: true, 
          onlineOrders: false, 
          reservations: false 
        }
      };

      console.log('🧹 Sanitized settings for creation:', sanitizedSettings);
      
      // Use locationId as the document ID for consistency
      const locationSettingsRef = doc(db, 'locationSettings', sanitizedSettings.locationId);
      await setDoc(locationSettingsRef, {
        ...sanitizedSettings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Location settings created successfully',
        settings: { id: locationSettingsRef.id, ...sanitizedSettings }
      };

    } catch (error) {
      console.error('Error creating location settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create location settings'
      };
    }
  }

  // Mark user setup as completed
  static async markSetupComplete(userId: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        hasCompletedSetup: true,
        setupCompletedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Setup marked as completed'
      };

    } catch (error) {
      console.error('Error marking setup complete:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark setup complete'
      };
    }
  }

  // Check if user has completed setup
  static async checkUserSetupStatus(userId: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          success: true,
          hasCompletedSetup: userData.hasCompletedSetup || false
        };
      }

      return {
        success: true,
        hasCompletedSetup: false
      };

    } catch (error) {
      console.error('Error checking setup status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check setup status',
        hasCompletedSetup: false
      };
    }
  }

  // Update location settings
  static async updateLocationSettings(locationId: string, settings: Partial<LocationSettingsData>) {
    try {
      console.log('🔧 Updating location settings for:', locationId);
      console.log('📝 Settings to update:', settings);
      
      // Sanitize settings to remove any undefined values
      const sanitizedSettings = {
        orderTypes: {
          dineIn: settings.orderTypes?.dineIn ?? true,
          takeaway: settings.orderTypes?.takeaway ?? true
        },
        paymentMethods: {
          cash: settings.paymentMethods?.cash ?? true,
          card: settings.paymentMethods?.card ?? true,
          upi: settings.paymentMethods?.upi ?? false
        },
        tax: {
          cgst: settings.tax?.cgst ?? 0,
          sgst: settings.tax?.sgst ?? 0
        },
        maxEmployees: settings.maxEmployees ?? 10,
        tables: settings.tables ? {
          totalTables: settings.tables.totalTables ?? 20,
          indoorTables: settings.tables.indoorTables ?? 15,
          outdoorTables: settings.tables.outdoorTables ?? 5
        } : {
          totalTables: 20,
          indoorTables: 15,
          outdoorTables: 5
        },
        operations: settings.operations ? {
          prepTime: settings.operations.prepTime ?? 15,
          autoAcceptOrders: settings.operations.autoAcceptOrders ?? false,
          enableKot: settings.operations.enableKot ?? true
        } : {
          prepTime: 15,
          autoAcceptOrders: false,
          enableKot: true
        },
        menu: settings.menu ? {
          categories: settings.menu.categories ?? ['appetizers', 'maincourse', 'desserts', 'beverages'],
          enableSpiceLevels: settings.menu.enableSpiceLevels ?? true,
          enableCustomization: settings.menu.enableCustomization ?? true
        } : {
          categories: ['appetizers', 'maincourse', 'desserts', 'beverages'],
          enableSpiceLevels: true,
          enableCustomization: true
        },
        enabledRoles: settings.enabledRoles ?? { admin: true, manager: true, employee: true },
        enabledFeatures: settings.enabledFeatures ?? { 
          inventory: true, 
          reports: true, 
          analytics: true, 
          onlineOrders: false, 
          reservations: false 
        }
      };
      
      console.log('🧹 Sanitized settings:', sanitizedSettings);
      
      // Use locationId as the document ID for consistency
      const docRef = doc(db, 'locationSettings', locationId);
      const docSnap = await getDoc(docRef);
      
      console.log('📄 Document exists:', docSnap.exists());
      
      if (!docSnap.exists()) {
        // No existing settings, create new ones
        console.log('➕ Creating new settings document');
        return await this.createLocationSettings({
          locationId,
          ...sanitizedSettings
        });
      }
      
      // Update existing settings
      console.log('🔄 Updating existing document');
      await updateDoc(docRef, {
        ...sanitizedSettings,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Settings updated successfully');

      return {
        success: true,
        message: 'Location settings updated successfully'
      };

    } catch (error) {
      console.error('❌ Error updating location settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update location settings'
      };
    }
  }

  // Get location settings
  static async getLocationSettings(locationId: string) {
    try {
      console.log('🔍 Getting location settings for:', locationId);
      
      // Use locationId as the document ID for consistency
      const docRef = doc(db, 'locationSettings', locationId);
      const docSnap = await getDoc(docRef);
      
      console.log('📄 Document exists:', docSnap.exists());
      
      if (!docSnap.exists()) {
        console.log('⚠️ No settings document found');
        return {
          success: true,
          settings: null
        };
      }

      const settings = {
        id: docSnap.id,
        ...docSnap.data()
      };

      console.log('✅ Found settings:', settings);

      return {
        success: true,
        settings
      };

    } catch (error) {
      console.error('❌ Error getting location settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get location settings',
        settings: null
      };
    }
  }

  // Get default setup template
  static getDefaultSetupTemplate() {
    return {
      tables: [
        {
          name: 'Table',
          capacity: 4,
          shape: 'square' as const,
          quantity: 5
        }
      ],
      staff: {
        maxEmployees: 10,
        enabledRoles: {
          admin: true,
          manager: true,
          employee: true
        }
      },
      operations: {
        orderTypes: {
          dineIn: true,
          takeaway: true
        },
        paymentMethods: {
          cash: true,
          card: true,
          upi: false
        },
        tax: {
          cgst: 0,
          sgst: 0
        }
      },
      features: {
        inventory: true,
        reports: true,
        analytics: true,
        onlineOrders: false,
        reservations: false
      }
    };
  }
}