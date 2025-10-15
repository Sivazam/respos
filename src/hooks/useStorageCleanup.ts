import { useEffect, useState } from 'react';
import { 
  getStorageStats, 
  checkForDuplicateOrderData, 
  safeCleanup, 
  cleanupTemporaryOrderData,
  getOrderRelatedKeys 
} from '../utils/storageCleanup';

interface UseStorageCleanupOptions {
  autoCleanup?: boolean;
  checkInterval?: number;
  maxOrderKeys?: number;
  enableLogging?: boolean;
}

interface StorageCleanupResult {
  stats: any;
  duplicates: any;
  isCleanupNeeded: boolean;
  cleanupCount: number;
  lastCleanupTime: Date | null;
  performCleanup: () => Promise<string[]>;
  checkForIssues: () => void;
}

/**
 * Hook for managing localStorage cleanup
 * 
 * This hook provides automatic cleanup functionality for localStorage,
 * particularly focused on order-related data that might cause duplication issues.
 */
export const useStorageCleanup = (options: UseStorageCleanupOptions = {}): StorageCleanupResult => {
  const {
    autoCleanup = true,
    checkInterval = 30000, // 30 seconds
    maxOrderKeys = 10,
    enableLogging = false
  } = options;

  const [stats, setStats] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any>(null);
  const [isCleanupNeeded, setIsCleanupNeeded] = useState(false);
  const [cleanupCount, setCleanupCount] = useState(0);
  const [lastCleanupTime, setLastCleanupTime] = useState<Date | null>(null);

  const log = (message: string, data?: any) => {
    if (enableLogging) {
      console.log(`[StorageCleanup] ${message}`, data);
    }
  };

  const checkForIssues = () => {
    const currentStats = getStorageStats();
    const currentDuplicates = checkForDuplicateOrderData();
    const orderKeys = getOrderRelatedKeys();
    
    setStats(currentStats);
    setDuplicates(currentDuplicates);
    
    // Determine if cleanup is needed
    const needsCleanup = 
      currentDuplicates.duplicates.length > 0 ||
      orderKeys.length > maxOrderKeys ||
      currentStats.debugRelatedKeys > 0;
    
    setIsCleanupNeeded(needsCleanup);
    
    log('Storage check completed', {
      stats: currentStats,
      duplicates: currentDuplicates,
      needsCleanup,
      orderKeyCount: orderKeys.length
    });
    
    return { stats: currentStats, duplicates: currentDuplicates, needsCleanup };
  };

  const performCleanup = async (): Promise<string[]> => {
    log('Starting cleanup process');
    
    let removedKeys: string[] = [];
    
    try {
      // First, check for duplicates
      const duplicateCheck = checkForDuplicateOrderData();
      if (duplicateCheck.duplicates.length > 0) {
        log('Removing duplicate order data', duplicateCheck);
        removedKeys = [...removedKeys, ...cleanupTemporaryOrderData()];
      }
      
      // Then perform safe cleanup
      const safeCleanupKeys = safeCleanup();
      removedKeys = [...removedKeys, ...safeCleanupKeys];
      
      // Update state
      setCleanupCount(prev => prev + 1);
      setLastCleanupTime(new Date());
      
      // Re-check after cleanup
      setTimeout(() => {
        checkForIssues();
      }, 1000);
      
      log('Cleanup completed', { removedKeys: removedKeys.length });
      
      return removedKeys;
    } catch (error) {
      log('Cleanup failed', error);
      throw error;
    }
  };

  // Auto-cleanup if enabled
  useEffect(() => {
    if (!autoCleanup) return;
    
    const interval = setInterval(() => {
      const { needsCleanup } = checkForIssues();
      
      if (needsCleanup) {
        log('Auto-cleanup triggered');
        performCleanup().catch(error => {
          log('Auto-cleanup failed', error);
        });
      }
    }, checkInterval);
    
    return () => clearInterval(interval);
  }, [autoCleanup, checkInterval]);

  // Initial check
  useEffect(() => {
    checkForIssues();
  }, []);

  return {
    stats,
    duplicates,
    isCleanupNeeded,
    cleanupCount,
    lastCleanupTime,
    performCleanup,
    checkForIssues
  };
};

/**
 * Hook specifically for order-related storage cleanup
 */
export const useOrderStorageCleanup = () => {
  const [orderKeyCount, setOrderKeyCount] = useState(0);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  
  const checkOrderStorage = () => {
    const orderKeys = getOrderRelatedKeys();
    const duplicateCheck = checkForDuplicateOrderData();
    
    setOrderKeyCount(orderKeys.length);
    setHasDuplicates(duplicateCheck.duplicates.length > 0);
    
    return {
      orderKeyCount: orderKeys.length,
      duplicates: duplicateCheck.duplicates,
      hasDuplicates: duplicateCheck.duplicates.length > 0
    };
  };
  
  const cleanupOrderStorage = () => {
    const removedKeys = cleanupTemporaryOrderData();
    setTimeout(checkOrderStorage, 1000);
    return removedKeys;
  };
  
  useEffect(() => {
    checkOrderStorage();
  }, []);
  
  return {
    orderKeyCount,
    hasDuplicates,
    checkOrderStorage,
    cleanupOrderStorage
  };
};