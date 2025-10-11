import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/db';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { Table, TableFormData, TableReservationData, OfflineTableAction } from '../types';
import { isIndexError, extractIndexUrl } from '../utils/indexesHelper';

interface TableContextType {
  tables: Table[];
  loading: boolean;
  error: string | null;
  createTable: (tableData: TableFormData) => Promise<void>;
  updateTable: (tableId: string, tableData: Partial<Table>) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  reserveTable: (tableId: string, reservationData: TableReservationData) => Promise<void>;
  occupyTable: (tableId: string, orderId: string) => Promise<void>;
  releaseTable: (tableId: string) => Promise<void>;
  switchTable: (fromTableId: string, toTableId: string) => Promise<void>;
  mergeTables: (tableIds: string[]) => Promise<void>;
  splitTables: (tableIds: string[]) => Promise<void>;
  getTableById: (tableId: string) => Table | undefined;
  getAvailableTables: () => Table[];
  getOccupiedTables: () => Table[];
  getReservedTables: () => Table[];
  refreshTables: () => Promise<void>;
  // Offline support
  syncOfflineActions: () => Promise<void>;
  addOfflineAction: (action: OfflineTableAction) => void;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

export const useTables = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error('useTables must be used within a TableProvider');
  }
  return context;
};

interface TableProviderProps {
  children: React.ReactNode;
}

export const TableProvider: React.FC<TableProviderProps> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();

  // Local storage key for offline actions
  const OFFLINE_STORAGE_KEY = 'restaurant_offline_table_actions';

  // Load offline actions from localStorage
  const getOfflineActions = (): OfflineTableAction[] => {
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading offline actions:', error);
      return [];
    }
  };

  // Save offline actions to localStorage
  const saveOfflineActions = (actions: OfflineTableAction[]) => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  };

  // Add offline action
  const addOfflineAction = useCallback((action: OfflineTableAction) => {
    const actions = getOfflineActions();
    actions.push(action);
    saveOfflineActions(actions);
  }, []);

  // Sync offline actions
  const syncOfflineActions = useCallback(async () => {
    if (!currentUser || !currentLocation) return;

    const actions = getOfflineActions();
    const unsyncedActions = actions.filter(action => !action.isSynced);

    if (unsyncedActions.length === 0) return;

    try {
      const batch = writeBatch(db);
      const syncedActionIds: string[] = [];

      for (const action of unsyncedActions) {
        const tableRef = doc(db, 'tables', action.tableId);

        switch (action.action) {
          case 'create':
            batch.set(tableRef, {
              ...action.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'update':
            batch.update(tableRef, {
              ...action.data,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'delete':
            batch.delete(tableRef);
            break;

          case 'reserve':
            batch.update(tableRef, {
              status: 'reserved',
              reservedBy: action.staffId,
              reservedAt: serverTimestamp(),
              reservationExpiryAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
              reservationDetails: action.data,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'occupy':
            batch.update(tableRef, {
              status: 'occupied',
              occupiedAt: serverTimestamp(),
              currentOrderId: action.data.orderId,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'release':
            batch.update(tableRef, {
              status: 'available',
              occupiedAt: null,
              currentOrderId: null,
              reservedBy: null,
              reservedAt: null,
              reservationExpiryAt: null,
              reservationDetails: null,
              mergedWith: null,
              updatedAt: serverTimestamp(),
            });
            break;
        }

        syncedActionIds.push(action.id);
      }

      await batch.commit();

      // Mark actions as synced
      const updatedActions = actions.map(action =>
        syncedActionIds.includes(action.id)
          ? { ...action, isSynced: true, syncedAt: new Date() }
          : action
      );
      saveOfflineActions(updatedActions);

    } catch (error) {
      console.error('Error syncing offline actions:', error);
      setError('Failed to sync offline actions');
    }
  }, [currentUser, currentLocation]);

  // Fetch tables for current location
  const fetchTables = useCallback(async () => {
    if (!currentLocation) {
      setTables([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try the simple query first (locationId only)
      const tablesQuery = query(
        collection(db, 'tables'),
        where('locationId', '==', currentLocation.id)
      );

      const unsubscribe = onSnapshot(tablesQuery, (snapshot) => {
        const tablesData: Table[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          tablesData.push({
            id: doc.id,
            name: data.name,
            locationId: data.locationId,
            capacity: data.capacity,
            status: data.status,
            occupiedAt: data.occupiedAt?.toDate(),
            reservedBy: data.reservedBy,
            reservedAt: data.reservedAt?.toDate(),
            reservationExpiryAt: data.reservationExpiryAt?.toDate(),
            reservationDetails: data.reservationDetails,
            currentOrderId: data.currentOrderId,
            mergedWith: data.mergedWith || [],
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });
        
        // Sort client-side by multiple criteria for better UX
        tablesData.sort((a, b) => {
          // First by status (available first)
          const statusOrder = { 'available': 0, 'reserved': 1, 'occupied': 2, 'maintenance': 3 };
          const aStatusOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 999;
          const bStatusOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 999;
          
          if (aStatusOrder !== bStatusOrder) {
            return aStatusOrder - bStatusOrder;
          }
          
          // Then by table number (extract numeric part for proper sorting)
          const aTableNum = parseInt(a.name.replace(/\D/g, '')) || 0;
          const bTableNum = parseInt(b.name.replace(/\D/g, '')) || 0;
          
          if (aTableNum !== bTableNum) {
            return aTableNum - bTableNum;
          }
          
          // Finally by name as fallback
          return a.name.localeCompare(b.name);
        });
        
        setTables(tablesData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching tables:', error);
        
        // Check if it's an index error and provide helpful information
        if (isIndexError(error)) {
          const indexUrl = extractIndexUrl(error);
          if (indexUrl) {
            console.warn('Firestore index required. Create it here:', indexUrl);
            console.info('Alternatively, the application will continue working with client-side sorting.');
            setError('Database optimization available. Contact administrator to improve performance.');
          } else {
            setError('Database configuration required. Please contact administrator.');
          }
        } else {
          setError('Failed to fetch tables');
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up tables listener:', error);
      setError('Failed to setup tables listener');
      setLoading(false);
    }
  }, [currentLocation]);

  // Initialize tables listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (currentLocation) {
      fetchTables().then((unsub) => {
        unsubscribe = unsub;
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchTables, currentLocation]);

  // Auto-sync offline actions when online
  useEffect(() => {
    const handleOnline = () => {
      syncOfflineActions();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineActions]);

  // Create new table
  const createTable = useCallback(async (tableData: TableFormData) => {
    if (!currentUser || !currentLocation) {
      throw new Error('User not authenticated or no location selected');
    }

    try {
      const newTable = {
        name: tableData.name,
        locationId: currentLocation.id,
        capacity: tableData.capacity,
        status: tableData.status || 'available',
        occupiedAt: null,
        reservedBy: null,
        reservedAt: null,
        reservationExpiryAt: null,
        reservationDetails: null,
        currentOrderId: null,
        mergedWith: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (navigator.onLine) {
        await addDoc(collection(db, 'tables'), newTable);
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId: `temp_${Date.now()}`,
          action: 'create',
          data: newTable,
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }, [currentUser, currentLocation, addOfflineAction]);

  // Update table
  const updateTable = useCallback(async (tableId: string, tableData: Partial<Table>) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const updateData = {
        ...tableData,
        updatedAt: serverTimestamp(),
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'tables', tableId), updateData);
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          action: 'update',
          data: updateData,
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error updating table:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Delete table
  const deleteTable = useCallback(async (tableId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      if (navigator.onLine) {
        await deleteDoc(doc(db, 'tables', tableId));
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          action: 'delete',
          data: {},
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Reserve table
  const reserveTable = useCallback(async (tableId: string, reservationData: TableReservationData) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const reserveData = {
        status: 'reserved',
        reservedBy: currentUser.uid,
        reservedAt: serverTimestamp(),
        reservationExpiryAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        reservationDetails: reservationData,
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'tables', tableId), reserveData);
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          action: 'reserve',
          data: { ...reserveData, orderId: null },
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error reserving table:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Occupy table
  const occupyTable = useCallback(async (tableId: string, orderId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const occupyData = {
        status: 'occupied',
        occupiedAt: serverTimestamp(),
        currentOrderId: orderId,
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'tables', tableId), occupyData);
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          action: 'occupy',
          data: occupyData,
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error occupying table:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Release table
  const releaseTable = useCallback(async (tableId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const releaseData = {
        status: 'available',
        occupiedAt: null,
        currentOrderId: null,
        reservedBy: null,
        reservedAt: null,
        reservationExpiryAt: null,
        reservationDetails: null,
        mergedWith: null,
      };

      if (navigator.onLine) {
        await updateDoc(doc(db, 'tables', tableId), releaseData);
      } else {
        // Add to offline actions
        const offlineAction: OfflineTableAction = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tableId,
          action: 'release',
          data: {},
          staffId: currentUser.uid,
          createdAt: new Date(),
          isSynced: false,
        };
        addOfflineAction(offlineAction);
      }
    } catch (error) {
      console.error('Error releasing table:', error);
      throw error;
    }
  }, [currentUser, addOfflineAction]);

  // Switch table (Manager/Admin only)
  const switchTable = useCallback(async (fromTableId: string, toTableId: string) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'superadmin') {
      throw new Error('Insufficient permissions');
    }

    try {
      const fromTable = tables.find(t => t.id === fromTableId);
      const toTable = tables.find(t => t.id === toTableId);

      if (!fromTable || !toTable) {
        throw new Error('Table not found');
      }

      if (toTable.status !== 'available') {
        throw new Error('Target table is not available');
      }

      // Move order and status from source to target table
      const batch = writeBatch(db);
      
      // Update source table
      const fromTableRef = doc(db, 'tables', fromTableId);
      batch.update(fromTableRef, {
        status: 'available',
        occupiedAt: null,
        currentOrderId: null,
        updatedAt: serverTimestamp(),
      });

      // Update target table
      const toTableRef = doc(db, 'tables', toTableId);
      batch.update(toTableRef, {
        status: 'occupied',
        occupiedAt: fromTable.occupiedAt || serverTimestamp(),
        currentOrderId: fromTable.currentOrderId,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (error) {
      console.error('Error switching table:', error);
      throw error;
    }
  }, [currentUser, tables]);

  // Merge tables
  const mergeTables = useCallback(async (tableIds: string[]) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    if (tableIds.length < 2) {
      throw new Error('At least 2 tables required for merging');
    }

    try {
      const batch = writeBatch(db);
      const primaryTableId = tableIds[0];
      const mergedTableIds = tableIds.slice(1);

      // Update primary table
      const primaryTableRef = doc(db, 'tables', primaryTableId);
      batch.update(primaryTableRef, {
        mergedWith: mergedTableIds,
        updatedAt: serverTimestamp(),
      });

      // Update merged tables
      mergedTableIds.forEach(tableId => {
        const tableRef = doc(db, 'tables', tableId);
        batch.update(tableRef, {
          status: 'occupied',
          mergedWith: [primaryTableId],
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error merging tables:', error);
      throw error;
    }
  }, [currentUser]);

  // Split tables
  const splitTables = useCallback(async (tableIds: string[]) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const batch = writeBatch(db);

      tableIds.forEach(tableId => {
        const tableRef = doc(db, 'tables', tableId);
        batch.update(tableRef, {
          mergedWith: [],
          status: 'available',
          occupiedAt: null,
          currentOrderId: null,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error splitting tables:', error);
      throw error;
    }
  }, [currentUser]);

  // Helper functions
  const getTableById = useCallback((tableId: string) => {
    return tables.find(table => table.id === tableId);
  }, [tables]);

  const getAvailableTables = useCallback(() => {
    return tables.filter(table => table.status === 'available' && !table.mergedWith?.length);
  }, [tables]);

  const getOccupiedTables = useCallback(() => {
    return tables.filter(table => table.status === 'occupied');
  }, [tables]);

  const getReservedTables = useCallback(() => {
    return tables.filter(table => table.status === 'reserved');
  }, [tables]);

  const refreshTables = useCallback(async () => {
    if (currentLocation) {
      await fetchTables();
    }
  }, [fetchTables, currentLocation]);

  const value: TableContextType = {
    tables,
    loading,
    error,
    createTable,
    updateTable,
    deleteTable,
    reserveTable,
    occupyTable,
    releaseTable,
    switchTable,
    mergeTables,
    splitTables,
    getTableById,
    getAvailableTables,
    getOccupiedTables,
    getReservedTables,
    refreshTables,
    syncOfflineActions,
    addOfflineAction,
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};