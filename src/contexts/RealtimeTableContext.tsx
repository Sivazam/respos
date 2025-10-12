import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  updateDoc, 
  onSnapshot,
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/db';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { Table, TableStatus, TableReservationData } from '../types';

interface RealtimeTableContextType {
  tables: Table[];
  loading: boolean;
  error: string | null;
  
  // Table operations
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  reserveTable: (tableId: string, reservationData: TableReservationData) => Promise<void>;
  occupyTable: (tableId: string, orderId: string) => Promise<void>;
  releaseTable: (tableId: string) => Promise<void>;
  mergeTables: (tableIds: string[]) => Promise<void>;
  unmergeTables: (tableIds: string[]) => Promise<void>;
  
  // Getters
  getTableById: (tableId: string) => Table | undefined;
  getAvailableTables: () => Table[];
  getOccupiedTables: () => Table[];
  getReservedTables: () => Table[];
  
  // Real-time subscriptions
  subscribeToTable: (tableId: string, callback: (table: Table) => void) => () => void;
}

const RealtimeTableContext = createContext<RealtimeTableContextType | undefined>(undefined);

export const useRealtimeTables = () => {
  const context = useContext(RealtimeTableContext);
  if (context === undefined) {
    throw new Error('useRealtimeTables must be used within a RealtimeTableProvider');
  }
  return context;
};

interface RealtimeTableProviderProps {
  children: React.ReactNode;
}

export const RealtimeTableProvider: React.FC<RealtimeTableProviderProps> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Subscribe to tables for current location
  useEffect(() => {
    if (!currentLocation) {
      setTables([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
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
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            occupiedAt: data.occupiedAt?.toDate(),
            reservedAt: data.reservedAt?.toDate(),
            reservationExpiryAt: data.reservationExpiryAt?.toDate()
          } as Table);
        });
        // Sort client-side by name
        tablesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setTables(tablesData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching tables:', error);
        setError('Failed to load tables');
        setLoading(false);
      });

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up tables listener:', err);
      setError('Failed to setup tables listener');
      setLoading(false);
    }
  }, [currentLocation]);

  // Update table status
  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      const tableRef = doc(db, 'tables', tableId);
      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      // Clear specific fields based on status
      if (status === 'available') {
        updateData.currentOrderId = null;
        updateData.reservedBy = null;
        updateData.reservedAt = null;
        updateData.reservationExpiryAt = null;
        updateData.reservationDetails = null;
      }

      await updateDoc(tableRef, updateData);
      console.log(`✅ Table ${tableId} status updated to ${status}`);
    } catch (err: any) {
      console.error('Error updating table status:', err);
      const errorMessage = err.message || 'Failed to update table status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Reserve table
  const reserveTable = useCallback(async (tableId: string, reservationData: TableReservationData): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      const tableRef = doc(db, 'tables', tableId);
      const reservationExpiryAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      await updateDoc(tableRef, {
        status: 'reserved',
        reservedBy: currentUser.uid,
        reservedAt: serverTimestamp(),
        reservationExpiryAt,
        reservationDetails: reservationData,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Table ${tableId} reserved successfully`);
    } catch (err: any) {
      console.error('Error reserving table:', err);
      const errorMessage = err.message || 'Failed to reserve table';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Occupy table
  const occupyTable = useCallback(async (tableId: string, orderId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      const tableRef = doc(db, 'tables', tableId);

      await updateDoc(tableRef, {
        status: 'occupied',
        currentOrderId: orderId,
        occupiedAt: serverTimestamp(),
        reservedBy: null,
        reservedAt: null,
        reservationExpiryAt: null,
        reservationDetails: null,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Table ${tableId} occupied with order ${orderId}`);
    } catch (err: any) {
      console.error('Error occupying table:', err);
      const errorMessage = err.message || 'Failed to occupy table';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Release table
  const releaseTable = useCallback(async (tableId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      const tableRef = doc(db, 'tables', tableId);

      await updateDoc(tableRef, {
        status: 'available',
        currentOrderId: null,
        occupiedAt: null,
        reservedBy: null,
        reservedAt: null,
        reservationExpiryAt: null,
        reservationDetails: null,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Table ${tableId} released successfully`);
    } catch (err: any) {
      console.error('Error releasing table:', err);
      const errorMessage = err.message || 'Failed to release table';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Merge tables
  const mergeTables = useCallback(async (tableIds: string[]): Promise<void> => {
    if (!currentUser || tableIds.length < 2) {
      throw new Error('At least 2 tables required for merging');
    }

    clearError();

    try {
      const batch = updateMultipleTables(tableIds, {
        status: 'occupied',
        mergedWith: tableIds.filter(id => id !== tableIds[0]), // All tables except the first one
        updatedAt: serverTimestamp()
      });

      await batch;
      console.log(`✅ Tables merged successfully:`, tableIds);
    } catch (err: any) {
      console.error('Error merging tables:', err);
      const errorMessage = err.message || 'Failed to merge tables';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Unmerge tables
  const unmergeTables = useCallback(async (tableIds: string[]): Promise<void> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    clearError();

    try {
      const batch = updateMultipleTables(tableIds, {
        status: 'available',
        mergedWith: [],
        currentOrderId: null,
        updatedAt: serverTimestamp()
      });

      await batch;
      console.log(`✅ Tables unmerged successfully:`, tableIds);
    } catch (err: any) {
      console.error('Error unmerging tables:', err);
      const errorMessage = err.message || 'Failed to unmerge tables';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUser, clearError]);

  // Helper function to update multiple tables
  const updateMultipleTables = useCallback(async (tableIds: string[], updateData: any) => {
    const { writeBatch, doc } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    tableIds.forEach(tableId => {
      const tableRef = doc(db, 'tables', tableId);
      batch.update(tableRef, updateData);
    });
    
    await batch.commit();
  }, []);

  // Get table by ID
  const getTableById = useCallback((tableId: string): Table | undefined => {
    return tables.find(table => table.id === tableId);
  }, [tables]);

  // Get available tables
  const getAvailableTables = useCallback((): Table[] => {
    return tables.filter(table => table.status === 'available');
  }, [tables]);

  // Get occupied tables
  const getOccupiedTables = useCallback((): Table[] => {
    return tables.filter(table => table.status === 'occupied');
  }, [tables]);

  // Get reserved tables
  const getReservedTables = useCallback((): Table[] => {
    return tables.filter(table => table.status === 'reserved');
  }, [tables]);

  // Subscribe to specific table
  const subscribeToTable = useCallback((tableId: string, callback: (table: Table) => void) => {
    if (!tableId) return () => {};

    const tableRef = doc(db, 'tables', tableId);
    
    return onSnapshot(tableRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const table: Table = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          occupiedAt: data.occupiedAt?.toDate(),
          reservedAt: data.reservedAt?.toDate(),
          reservationExpiryAt: data.reservationExpiryAt?.toDate()
        } as Table;
        callback(table);
      }
    });
  }, []);

  // Check for expired reservations
  useEffect(() => {
    const checkExpiredReservations = () => {
      const now = new Date();
      tables.forEach(table => {
        if (table.status === 'reserved' && table.reservationExpiryAt) {
          if (now > table.reservationExpiryAt) {
            // Auto-release expired reservation
            releaseTable(table.id).catch(err => {
              console.error('Error auto-releasing expired reservation:', err);
            });
          }
        }
      });
    };

    // Check every minute
    const interval = setInterval(checkExpiredReservations, 60000);
    return () => clearInterval(interval);
  }, [tables, releaseTable]);

  // Context value
  const value: RealtimeTableContextType = {
    tables,
    loading,
    error,
    
    // Table operations
    updateTableStatus,
    reserveTable,
    occupyTable,
    releaseTable,
    mergeTables,
    unmergeTables,
    
    // Getters
    getTableById,
    getAvailableTables,
    getOccupiedTables,
    getReservedTables,
    
    // Real-time subscriptions
    subscribeToTable
  };

  return (
    <RealtimeTableContext.Provider value={value}>
      {children}
    </RealtimeTableContext.Provider>
  );
};