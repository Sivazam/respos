/**
 * Local Storage Cleanup Utility
 * 
 * This utility provides functions to clean up various types of localStorage data
 * that might cause issues with order display and application state.
 */

export interface StorageCleanupOptions {
  clearOrderData?: boolean;
  clearTableData?: boolean;
  clearUserData?: boolean;
  clearCacheData?: boolean;
  clearDebugData?: boolean;
  clearAll?: boolean;
}

export interface StorageStats {
  totalKeys: number;
  orderRelatedKeys: number;
  tableRelatedKeys: number;
  userRelatedKeys: number;
  cacheRelatedKeys: number;
  debugRelatedKeys: number;
  otherKeys: number;
}

/**
 * Get statistics about localStorage usage
 */
export const getStorageStats = (): StorageStats => {
  const stats: StorageStats = {
    totalKeys: 0,
    orderRelatedKeys: 0,
    tableRelatedKeys: 0,
    userRelatedKeys: 0,
    cacheRelatedKeys: 0,
    debugRelatedKeys: 0,
    otherKeys: 0
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      stats.totalKeys++;
      
      if (isOrderRelatedKey(key)) {
        stats.orderRelatedKeys++;
      } else if (isTableRelatedKey(key)) {
        stats.tableRelatedKeys++;
      } else if (isUserRelatedKey(key)) {
        stats.userRelatedKeys++;
      } else if (isCacheRelatedKey(key)) {
        stats.cacheRelatedKeys++;
      } else if (isDebugRelatedKey(key)) {
        stats.debugRelatedKeys++;
      } else {
        stats.otherKeys++;
      }
    }
  }

  return stats;
};

/**
 * Check if a key is order-related
 */
const isOrderRelatedKey = (key: string): boolean => {
  return key.startsWith('temp_order_') ||
         key.startsWith('manager_pending_') ||
         key.startsWith('restaurant_temporary_order') ||
         key.startsWith('order_') ||
         key.startsWith('cart_') ||
         key.startsWith('partial_order_') ||
         key.startsWith('ongoing_order_');
};

/**
 * Check if a key is table-related
 */
const isTableRelatedKey = (key: string): boolean => {
  return key.startsWith('table_') ||
         key.startsWith('table_status_') ||
         key.startsWith('assigned_table_');
};

/**
 * Check if a key is user-related
 */
const isUserRelatedKey = (key: string): boolean => {
  return key.startsWith('user_') ||
         key.startsWith('auth_') ||
         key.startsWith('staff_') ||
         key.startsWith('manager_') ||
         key.startsWith('profile_');
};

/**
 * Check if a key is cache-related
 */
const isCacheRelatedKey = (key: string): boolean => {
  return key.startsWith('menu_') ||
         key.startsWith('location_') ||
         key.startsWith('cache_') ||
         key.startsWith('cached_');
};

/**
 * Check if a key is debug-related
 */
const isDebugRelatedKey = (key: string): boolean => {
  return key.startsWith('debug_') ||
         key.startsWith('test_') ||
         key.startsWith('dev_') ||
         key.startsWith('temp_');
};

/**
 * Clean up localStorage based on options
 */
export const cleanupStorage = (options: StorageCleanupOptions = {}): string[] => {
  const {
    clearOrderData = false,
    clearTableData = false,
    clearUserData = false,
    clearCacheData = false,
    clearDebugData = false,
    clearAll = false
  } = options;

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      if (clearAll) {
        keysToRemove.push(key);
      } else {
        if (clearOrderData && isOrderRelatedKey(key)) {
          keysToRemove.push(key);
        }
        if (clearTableData && isTableRelatedKey(key)) {
          keysToRemove.push(key);
        }
        if (clearUserData && isUserRelatedKey(key)) {
          keysToRemove.push(key);
        }
        if (clearCacheData && isCacheRelatedKey(key)) {
          keysToRemove.push(key);
        }
        if (clearDebugData && isDebugRelatedKey(key)) {
          keysToRemove.push(key);
        }
      }
    }
  }

  // Remove the keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  return keysToRemove;
};

/**
 * Clean up all order-related data
 */
export const cleanupOrderData = (): string[] => {
  return cleanupStorage({ clearOrderData: true });
};

/**
 * Clean up all temporary order data that might cause duplication
 */
export const cleanupTemporaryOrderData = (): string[] => {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('temp_order_') ||
      key.startsWith('restaurant_temporary_order') ||
      key.startsWith('partial_order_') ||
      key.startsWith('ongoing_order_')
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  return keysToRemove;
};

/**
 * Get all order-related keys for debugging
 */
export const getOrderRelatedKeys = (): string[] => {
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isOrderRelatedKey(key)) {
      keys.push(key);
    }
  }

  return keys;
};

/**
 * Check for potential duplicate order data
 */
export const checkForDuplicateOrderData = (): { duplicates: string[], details: any[] } => {
  const orderKeys = getOrderRelatedKeys();
  const duplicates: string[] = [];
  const details: any[] = [];

  // Group by order ID if possible
  const orderGroups: { [key: string]: string[] } = {};

  orderKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        const orderId = parsed.id || parsed.orderId;
        
        if (orderId) {
          if (!orderGroups[orderId]) {
            orderGroups[orderId] = [];
          }
          orderGroups[orderId].push(key);
        }
      }
    } catch (error) {
      // Skip invalid JSON
    }
  });

  // Find duplicates
  Object.entries(orderGroups).forEach(([orderId, keys]) => {
    if (keys.length > 1) {
      duplicates.push(orderId);
      details.push({
        orderId,
        keys,
        count: keys.length
      });
    }
  });

  return { duplicates, details };
};

/**
 * Export all localStorage data for debugging
 */
export const exportStorageData = (): string => {
  const data: { [key: string]: any } = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }
  }

  return JSON.stringify(data, null, 2);
};

/**
 * Clear all localStorage data (use with caution)
 */
export const clearAllStorage = (): string[] => {
  return cleanupStorage({ clearAll: true });
};

/**
 * Safe cleanup that only removes potentially problematic data
 */
export const safeCleanup = (): string[] => {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('temp_order_') ||
      key.startsWith('restaurant_temporary_order') ||
      key.startsWith('debug_') ||
      key.startsWith('test_') ||
      key.startsWith('dev_')
    )) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  return keysToRemove;
};