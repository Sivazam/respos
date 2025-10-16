import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface PWAContextType {
  isOnline: boolean;
  isInstalled: boolean;
  installPrompt: any;
  showInstallPrompt: boolean;
  installApp: () => Promise<void>;
  dismissInstallPrompt: () => void;
  networkSpeed: string;
  lastSyncTime: Date | null;
  triggerSync: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState('unknown');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches;
      
      setIsInstalled(isStandalone || isInWebAppiOS || isInWebAppChrome);
    };

    checkInstalled();
  }, []);

  // Network monitoring
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Connection restored');
      try {
        await triggerSync();
      } catch (error) {
        console.warn('[PWA] Sync on online failed:', error);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost. Some features may not work.');
    };

    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setNetworkSpeed(connection.effectiveType || connection.type || 'unknown');
      }
    };

    const handleConnectionChange = () => {
      updateNetworkInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt after delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true);
        }
      }, 5000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setInstallPrompt(null);
      toast.success('App installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const installApp = async () => {
    if (!installPrompt) return;

    try {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
      
      setInstallPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
      toast.error('Installation failed');
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const triggerSync = async () => {
    if (!isOnline) return;

    try {
      // Trigger background sync if supported
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync-orders');
      }

      setLastSyncTime(new Date());
      console.log('[PWA] Background sync triggered');
    } catch (error) {
      console.error('[PWA] Background sync failed:', error);
      // Don't throw error to prevent unhandled promise rejections
    }
  };

  // Periodic sync when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      try {
        await triggerSync();
      } catch (error) {
        console.warn('[PWA] Periodic sync failed, suppressing error:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isOnline]);

  const value: PWAContextType = {
    isOnline,
    isInstalled,
    installPrompt,
    showInstallPrompt,
    installApp,
    dismissInstallPrompt,
    networkSpeed,
    lastSyncTime,
    triggerSync
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};