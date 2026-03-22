# Complete Offline Support Implementation Plan

## Executive Summary

Transform the Millet Home Foods POS system into a **fully offline-capable PWA** using **IndexedDB as the primary local data store**, with automatic synchronization to Firestore when online.

**Current State:**
- ✅ Firestore offline persistence enabled (read-only cache)
- ✅ localStorage queues for orders and tables
- ❌ No offline write support for menu, inventory, sales
- ❌ No structured local database
- ❌ Limited conflict resolution

**Target State:**
- ✅ IndexedDB as primary local database (all entities)
- ✅ Write operations work 100% offline
- ✅ Automatic background sync when online
- ✅ Conflict resolution strategy
- ✅ Real-time sync status UI
- ✅ Storage management and cleanup

---

## Architecture Overview

### Proposed Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer (DAL)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  IndexedDB DAL  │  │  Firestore DAL  │  │  localStorage   │ │
│  │  (Primary)      │  │  (Sync Target)  │  │  (Cache/Meta)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Sync Engine                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Queue Manager  │  │  Conflict       │  │  Network        │ │
│  │                 │  │  Resolver       │  │  Monitor        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    (When Online Only)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Firebase Firestore                         │
│                   (Cloud Source of Truth)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **IndexedDB-First**: All CRUD operations write to IndexedDB first
2. **Optimistic UI**: UI updates immediately from local data
3. **Background Sync**: Sync queue processed when online
4. **Conflict Resolution**: Timestamp-based with user intervention for critical conflicts
5. **Progressive Enhancement**: App works fully offline, syncs when online

---

## Phase 1: Foundation (Week 1-2)

### 1.1 IndexedDB Library Setup

**Task:** Install and configure a modern IndexedDB wrapper library

**Options:**
- **idb** (recommended) - Lightweight, promise-based, by Chrome team
- **dexie** - Feature-rich, excellent for complex queries
- **localforage** - Simple API, fallback to localStorage

**Recommendation:** Use **idb** for simplicity and small bundle size

```bash
npm install idb
```

**File:** `src/lib/db-local.ts` (NEW)
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface RestaurantDBSchema extends DBSchema {
  menuItems: {
    key: string;
    value: MenuItem & { localId: string; syncedAt?: Date; isDeleted?: boolean };
    indexes: { 'by-category': string; 'by-location': string };
  };
  categories: {
    key: string;
    value: Category & { localId: string; syncedAt?: Date; isDeleted?: boolean };
    indexes: { 'by-location': string };
  };
  orders: {
    key: string;
    value: Order & { localId: string; syncedAt?: Date; isDeleted?: boolean };
    indexes: { 'by-status': string; 'by-location': string; 'by-date': string };
  };
  // ... all other entities
  syncQueue: {
    key: string;
    value: SyncAction;
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
}

const DB_NAME = 'restaurant-pos-db';
const DB_VERSION = 1;

export async function openLocalDB(): Promise<IDBPDatabase<RestaurantDBSchema>> {
  return await openDB<RestaurantDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores and indexes
      const menuItemStore = db.createObjectStore('menuItems', { keyPath: 'localId' });
      menuItemStore.createIndex('by-category', 'categoryId');
      menuItemStore.createIndex('by-location', 'locationId');
      
      const categoryStore = db.createObjectStore('categories', { keyPath: 'localId' });
      categoryStore.createIndex('by-location', 'locationId');
      
      const orderStore = db.createObjectStore('orders', { keyPath: 'localId' });
      orderStore.createIndex('by-status', 'status');
      orderStore.createIndex('by-location', 'locationId');
      orderStore.createIndex('by-date', 'createdAt');
      
      db.createObjectStore('syncQueue', { keyPath: 'id' });
      // ... other stores
    },
  });
}
```

---

### 1.2 Sync Queue System

**File:** `src/services/SyncService.ts` (NEW)

```typescript
export type SyncActionType = 
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'CREATE_MENU_ITEM' | 'UPDATE_MENU_ITEM' | 'DELETE_MENU_ITEM'
  | 'CREATE_CATEGORY' | 'UPDATE_CATEGORY' | 'DELETE_CATEGORY'
  | 'CREATE_ORDER' | 'UPDATE_ORDER' | 'DELETE_ORDER'
  | 'CREATE_SALE' | 'UPDATE_SALE' | 'DELETE_SALE'
  // ... all entity types

export interface SyncAction {
  id: string;
  type: SyncActionType;
  collection: string;
  entityId: string;
  data?: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}

export class SyncService {
  private db: IDBPDatabase<RestaurantDBSchema>;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.init();
    this.setupNetworkListeners();
  }

  private async init() {
    this.db = await openLocalDB();
    this.scheduleSync();
  }

  // Add action to sync queue
  async queueAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.add('syncQueue', {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    });
    
    // Trigger sync if online
    if (this.isOnline) {
      this.scheduleSync();
    }
    
    return id;
  }

  // Process sync queue
  async processQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      const pendingActions = await this.db.getAllFromIndex('syncQueue', 'by-status', 'pending');
      
      for (const action of pendingActions) {
        await this.executeAction(action);
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeAction(action: SyncAction): Promise<void> {
    try {
      // Update status to syncing
      await this.db.put('syncQueue', { ...action, status: 'syncing' });
      
      // Execute based on type
      switch (action.type) {
        case 'CREATE_MENU_ITEM':
          await this.syncCreateMenuItem(action);
          break;
        case 'UPDATE_MENU_ITEM':
          await this.syncUpdateMenuItem(action);
          break;
        // ... handle all types
      }
      
      // Mark as synced
      await this.db.delete('syncQueue', action.id);
      
    } catch (error) {
      // Handle failure
      await this.handleSyncFailure(action, error);
    }
  }

  private async handleSyncFailure(action: SyncAction, error: Error): Promise<void> {
    const maxRetries = 3;
    
    if (action.retryCount >= maxRetries) {
      await this.db.put('syncQueue', {
        ...action,
        status: 'failed',
        error: error.message,
      });
      // Notify user of persistent failure
      this.notifySyncFailure(action);
    } else {
      await this.db.put('syncQueue', {
        ...action,
        retryCount: action.retryCount + 1,
        status: 'pending',
      });
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.scheduleSync();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private scheduleSync() {
    // Debounce sync operations
    setTimeout(() => this.processQueue(), 1000);
  }

  private notifySyncFailure(action: SyncAction) {
    // Dispatch custom event for UI to show notification
    window.dispatchEvent(new CustomEvent('sync-failure', { detail: action }));
  }
}

// Singleton instance
export const syncService = new SyncService();
```

---

### 1.3 Data Access Layer (DAL)

**File:** `src/lib/dal.ts` (NEW)

```typescript
import { syncService } from '../services/SyncService';
import { db as firestoreDb } from '../firebase/config';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

export class DataAccessLayer {
  private localDb: IDBPDatabase<RestaurantDBSchema>;

  constructor() {
    this.init();
  }

  private async init() {
    this.localDb = await openLocalDB();
  }

  // Generic CRUD operations for local database
  async create<T extends keyof RestaurantDBSchema>(
    store: T,
    data: RestaurantDBSchema[T]['value']
  ): Promise<string> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entityWithMeta = {
      ...data,
      localId,
      syncedAt: undefined,
      isDeleted: false,
    };
    
    await this.localDb.add(store, entityWithMeta as any);
    
    // Queue for sync
    await syncService.queueAction({
      type: `CREATE_${this.getStoreName(store)}` as any,
      collection: store as string,
      entityId: localId,
      data: entityWithMeta,
    });
    
    return localId;
  }

  async update<T extends keyof RestaurantDBSchema>(
    store: T,
    id: string,
    updates: Partial<RestaurantDBSchema[T]['value']>
  ): Promise<void> {
    const entity = await this.localDb.get(store, id);
    if (!entity) throw new Error(`Entity ${id} not found`);
    
    const updatedEntity = {
      ...entity,
      ...updates,
    } as any;
    
    await this.localDb.put(store, updatedEntity);
    
    // Queue for sync
    await syncService.queueAction({
      type: `UPDATE_${this.getStoreName(store)}` as any,
      collection: store as string,
      entityId: id,
      data: updates,
    });
  }

  async delete<T extends keyof RestaurantDBSchema>(
    store: T,
    id: string
  ): Promise<void> {
    const entity = await this.localDb.get(store, id);
    if (!entity) return;
    
    // Soft delete
    const updatedEntity = {
      ...entity,
      isDeleted: true,
    } as any;
    
    await this.localDb.put(store, updatedEntity);
    
    // Queue for sync
    await syncService.queueAction({
      type: `DELETE_${this.getStoreName(store)}` as any,
      collection: store as string,
      entityId: id,
    });
  }

  async getById<T extends keyof RestaurantDBSchema>(
    store: T,
    id: string
  ): Promise<RestaurantDBSchema[T]['value'] | undefined> {
    return await this.localDb.get(store, id);
  }

  async getAll<T extends keyof RestaurantDBSchema>(
    store: T,
    filter?: { index: string; value: any }
  ): Promise<RestaurantDBSchema[T]['value'][]> {
    if (filter) {
      return await this.localDb.getAllFromIndex(store, filter.index, filter.value);
    }
    return await this.localDb.getAll(store);
  }

  // Sync from Firestore to local DB (initial load or refresh)
  async syncFromFirestore<T extends keyof RestaurantDBSchema>(
    store: T,
    collectionName: string,
    queries: any[] = []
  ): Promise<void> {
    const q = query(collection(firestoreDb, collectionName), ...queries);
    const snapshot = await getDocs(q);
    
    const tx = this.localDb.transaction(store, 'readwrite');
    
    for (const doc of snapshot.docs) {
      const existing = await tx.store.get(doc.id);
      
      if (existing && existing.syncedAt) {
        // Conflict resolution: use server timestamp
        const serverTime = existing.updatedAt?.toMillis?.() || 0;
        const localTime = existing.updatedAt as any;
        
        if (serverTime > localTime) {
          // Server is newer, update local
          await tx.store.put({
            ...existing,
            ...doc.data(),
            syncedAt: new Date(),
          });
        }
      } else {
        // No local version, insert
        await tx.store.put({
          ...doc.data(),
          localId: doc.id,
          syncedAt: new Date(),
        });
      }
    }
    
    await tx.done;
  }

  private getStoreName(store: keyof RestaurantDBSchema): string {
    return store.toString().toUpperCase().replace('S', '');
  }
}

export const dal = new DataAccessLayer();
```

---

## Phase 2: Entity Implementation (Week 2-4)

### 2.1 Menu Items Offline Support

**Modify:** `src/contexts/MenuItemContext.tsx`

```typescript
// Add imports
import { dal } from '../lib/dal';
import { syncService } from '../services/SyncService';

// Modify addMenuItem
const addMenuItem = async (itemData: Omit<MenuItem, 'id'>) => {
  try {
    // Create in IndexedDB (works offline)
    const localId = await dal.create('menuItems', {
      ...itemData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Update local state immediately (optimistic UI)
    const newItem: MenuItem = {
      ...itemData,
      id: localId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setMenuItems(prev => [...prev, newItem]);
    
    return localId;
  } catch (error) {
    console.error('Error adding menu item:', error);
    throw error;
  }
};

// Modify updateMenuItem
const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
  try {
    // Update in IndexedDB
    await dal.update('menuItems', id, {
      ...updates,
      updatedAt: new Date(),
    });
    
    // Update local state immediately
    setMenuItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw error;
  }
};

// Modify deleteMenuItem
const deleteMenuItem = async (id: string) => {
  try {
    // Soft delete in IndexedDB
    await dal.delete('menuItems', id);
    
    // Update local state
    setMenuItems(prev => prev.filter(item => item.id !== id));
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw error;
  }
};

// Modify refreshMenuItems - sync from Firestore
const refreshMenuItems = async () => {
  try {
    if (navigator.onLine) {
      // Sync from Firestore to IndexedDB
      await dal.syncFromFirestore(
        'menuItems',
        'menuItems',
        [where('locationId', '==', currentLocation?.id || '')]
      );
    }
    
    // Load from IndexedDB
    const items = await dal.getAll('menuItems', {
      index: 'by-location',
      value: currentLocation?.id,
    });
    
    setMenuItems(items.filter(item => !item.isDeleted));
  } catch (error) {
    console.error('Error refreshing menu items:', error);
    setError('Failed to load menu items');
  }
};
```

---

### 2.2 Categories Offline Support

**Modify:** `src/contexts/CategoryContext.tsx`

Similar pattern as MenuItemContext above.

---

### 2.3 Orders Offline Support (Enhancement)

**Modify:** `src/contexts/OrderContext.tsx`

```typescript
// Replace localStorage queue with IndexedDB
const createOrder = async (orderData: Omit<Order, 'id'>) => {
  const localId = await dal.create('orders', {
    ...orderData,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return localId;
};

// Similar for updateOrder, deleteOrder, updateOrderStatus, etc.
```

---

### 2.4 Sales Offline Support

**Modify:** `src/contexts/SalesContext.tsx`

```typescript
// Add IndexedDB store for sales
// Implement create, update, delete with sync queue
```

---

### 2.5 Inventory Offline Support

**Modify:** 
- `src/contexts/StockContext.tsx`
- `src/contexts/PurchaseContext.tsx`
- `src/contexts/ReturnContext.tsx`

```typescript
// Add IndexedDB stores for stockUpdates, purchases, returns
// Implement full offline CRUD with sync
```

---

### 2.6 Customer Data Offline Support

**Modify:** `src/contexts/CustomerDataService.ts`

```typescript
// Queue customer data collection offline
const upsertCustomerData = async (data: CustomerData) => {
  await dal.create('customerData', {
    ...data,
    timestamp: Date.now(),
  });
  
  // Sync when online
};
```

---

## Phase 3: Sync Engine Enhancement (Week 4-5)

### 3.1 Conflict Resolution Strategy

**File:** `src/services/ConflictResolver.ts` (NEW)

```typescript
export interface ConflictResolution {
  strategy: 'server-wins' | 'client-wins' | 'manual' | 'merge';
  entity: string;
  entityId: string;
  localData: any;
  serverData: any;
}

export class ConflictResolver {
  // Timestamp-based resolution
  async resolveByTimestamp(
    entity: string,
    entityId: string,
    localData: any,
    serverData: any
  ): Promise<'local' | 'server'> {
    const localTime = localData.updatedAt?.toMillis?.() || localData.updatedAt || 0;
    const serverTime = serverData.updatedAt?.toMillis?.() || serverData.updatedAt || 0;
    
    // Server wins for critical data (payments, orders)
    if (entity === 'orders' || entity === 'sales') {
      return 'server';
    }
    
    // Latest timestamp wins for others
    return serverTime > localTime ? 'server' : 'local';
  }

  // Manual resolution for critical conflicts
  async markForManualResolution(conflict: ConflictResolution): Promise<void> {
    // Store in special conflicts store
    const db = await openLocalDB();
    await db.add('conflicts', {
      ...conflict,
      createdAt: Date.now(),
      resolved: false,
    });
    
    // Notify user
    window.dispatchEvent(new CustomEvent('conflict-detected', { detail: conflict }));
  }
}

export const conflictResolver = new ConflictResolver();
```

---

### 3.2 Sync Status UI Component

**File:** `src/components/sync/SyncStatusIndicator.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Sync, CheckCircle, AlertCircle } from 'lucide-react';

export const SyncStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Listen to sync queue changes
    const updatePendingCount = async () => {
      const db = await openLocalDB();
      const pending = await db.getAllFromIndex('syncQueue', 'by-status', 'pending');
      setPendingCount(pending.length);
    };
    
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="text-green-600" size={18} />
          {pendingCount > 0 ? (
            <span className="text-sm text-yellow-600">
              {pendingCount} pending sync
            </span>
          ) : (
            <CheckCircle className="text-green-600" size={18} />
          )}
        </>
      ) : (
        <>
          <WifiOff className="text-red-600" size={18} />
          <span className="text-sm text-red-600">Offline Mode</span>
        </>
      )}
    </div>
  );
};
```

---

### 3.3 Sync Management Dashboard

**File:** `src/pages/settings/SyncSettingsPage.tsx` (NEW)

```typescript
// Show sync history
// Allow manual sync trigger
// Show failed syncs with retry option
// Storage usage statistics
```

---

## Phase 4: Storage Management (Week 5)

### 4.1 Storage Cleanup Service

**File:** `src/services/StorageManager.ts` (NEW)

```typescript
export class StorageManager {
  private readonly MAX_SYNC_QUEUE_SIZE = 1000;
  private readonly MAX_HISTORY_DAYS = 30;

  async cleanup(): Promise<void> {
    const db = await openLocalDB();
    
    // Cleanup old sync actions
    const oldActions = await db.getAll('syncQueue');
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const action of oldActions) {
      if (action.timestamp < thirtyDaysAgo || action.status === 'synced') {
        await db.delete('syncQueue', action.id);
      }
    }
    
    // Cleanup soft-deleted entities older than 30 days
    const stores = ['menuItems', 'categories', 'orders', 'products'];
    for (const store of stores) {
      const items = await db.getAll(store as any);
      for (const item of items) {
        if (item.isDeleted && item.syncedAt) {
          const syncedTime = item.syncedAt instanceof Date 
            ? item.syncedAt.getTime() 
            : item.syncedAt;
          
          if (syncedTime < thirtyDaysAgo) {
            await db.delete(store as any, item.localId);
          }
        }
      }
    }
    
    // Report storage usage
    this.reportStorageUsage();
  }

  private async reportStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usageMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaMB = (estimate.quota || 0) / (1024 * 1024);
      
      console.log(`Storage: ${usageMB.toFixed(2)}MB / ${quotaMB.toFixed(2)}MB`);
      
      // Warn if over 80% used
      if (usageMB / quotaMB > 0.8) {
        window.dispatchEvent(new CustomEvent('storage-warning', {
          detail: { usageMB, quotaMB },
        }));
      }
    }
  }
}

export const storageManager = new StorageManager();

// Run cleanup daily
setInterval(() => storageManager.cleanup(), 24 * 60 * 60 * 1000);
```

---

## Phase 5: Testing & Polish (Week 6)

### 5.1 Offline Testing Scenarios

Create comprehensive test cases:

1. **Menu Management Offline**
   - Create menu item offline → verify IndexedDB → go online → verify Firestore sync
   - Update menu item offline → verify conflict resolution
   - Delete menu item offline → verify soft delete → sync

2. **Order Flow Offline**
   - Create complete order offline
   - Update order status offline
   - Process payment offline
   - Sync when online

3. **Inventory Offline**
   - Add stock update offline
   - Create purchase offline
   - Create return offline

4. **Network Transitions**
   - Online → offline → online (verify sync)
   - Rapid online/offline switching
   - Sync failure and retry

### 5.2 Performance Optimization

- Implement lazy loading for large datasets
- Add pagination for orders/sales history
- Optimize IndexedDB indexes
- Implement data compression for large objects

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Install `idb` library
- [ ] Create `src/lib/db-local.ts` with IndexedDB schema
- [ ] Create `src/services/SyncService.ts`
- [ ] Create `src/lib/dal.ts` (Data Access Layer)
- [ ] Test basic CRUD operations

### Phase 2: Entity Implementation
- [ ] MenuItemContext - full offline support
- [ ] CategoryContext - full offline support
- [ ] ProductContext - full offline support
- [ ] OrderContext - migrate to IndexedDB
- [ ] SalesContext - full offline support
- [ ] StockContext - full offline support
- [ ] PurchaseContext - full offline support
- [ ] ReturnContext - full offline support
- [ ] CustomerDataService - offline support

### Phase 3: Sync Engine
- [ ] Create `src/services/ConflictResolver.ts`
- [ ] Create `src/components/sync/SyncStatusIndicator.tsx`
- [ ] Create `src/pages/settings/SyncSettingsPage.tsx`
- [ ] Add sync status to app header
- [ ] Implement conflict resolution UI

### Phase 4: Storage Management
- [ ] Create `src/services/StorageManager.ts`
- [ ] Implement automatic cleanup
- [ ] Add storage usage monitoring
- [ ] Add user warnings for low storage

### Phase 5: Testing
- [ ] Write offline test scenarios
- [ ] Test all CRUD operations offline
- [ ] Test sync conflict resolution
- [ ] Performance testing with large datasets
- [ ] Cross-browser testing (IndexedDB support)

---

## Migration Strategy

### Gradual Rollout

1. **Week 1-2**: Deploy IndexedDB foundation alongside existing code
2. **Week 3-4**: Migrate menu/categories (low-risk entities)
3. **Week 5-6**: Migrate orders/sales (critical entities)
4. **Week 7**: Migrate inventory (complex entities)
5. **Week 8**: Full testing and bug fixes

### Data Migration

```typescript
// Migration script to populate IndexedDB from Firestore
async function migrateFromFirestore() {
  const db = await openLocalDB();
  
  // Migrate menu items
  const menuSnapshot = await getDocs(collection(firestoreDb, 'menuItems'));
  const tx = db.transaction('menuItems', 'readwrite');
  
  for (const doc of menuSnapshot.docs) {
    await tx.store.put({
      ...doc.data(),
      localId: doc.id,
      syncedAt: new Date(),
    });
  }
  
  await tx.done;
  
  // Repeat for other collections
}
```

---

## Technical Considerations

### IndexedDB vs localStorage

| Aspect | IndexedDB | localStorage |
|--------|-----------|--------------|
| Storage Limit | ~6GB (varies) | ~5-10MB |
| Data Type | Structured objects | Strings only |
| Performance | Async, non-blocking | Sync, blocking |
| Query Support | Indexes, cursors | None |
| Versioning | Schema versioning | None |

### Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (iOS 10+)
- ✅ Opera: Full support

### Security Considerations

1. **Data Encryption**: Consider encrypting sensitive data in IndexedDB
2. **XSS Protection**: IndexedDB accessible via JavaScript (sanitize inputs)
3. **Authentication**: Sync only authenticated user's data
4. **Data Expiry**: Implement TTL for sensitive temporary data

---

## Estimated Timeline

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: Foundation | 2 weeks | High |
| Phase 2: Entities | 2 weeks | Medium |
| Phase 3: Sync Engine | 1 week | High |
| Phase 4: Storage | 1 week | Low |
| Phase 5: Testing | 1 week | Medium |
| **Total** | **7 weeks** | |

---

## Conclusion

This plan provides a comprehensive approach to making the Millet Home Foods POS system fully offline-capable using IndexedDB as the primary local data store. The implementation follows modern PWA best practices and ensures data consistency through a robust sync mechanism.

**Key Benefits:**
- ✅ 100% offline functionality for all features
- ✅ Automatic background sync when online
- ✅ Conflict resolution to prevent data loss
- ✅ Better performance (local-first reads)
- ✅ Larger storage capacity (6GB vs 10MB)
- ✅ Better user experience with sync status feedback
