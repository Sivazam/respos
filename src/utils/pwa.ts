interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallPrompt {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: string;
  install: () => Promise<'accepted' | 'dismissed'>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;

export function registerPWAInstallPrompt(): PWAInstallPrompt {
  // Check if app is already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled = true;
  }

  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
  });

  return {
    isInstallable: !!deferredPrompt && !isInstalled,
    isInstalled,
    platform: getPlatform(),
    install: async () => {
      if (!deferredPrompt) {
        throw new Error('Install prompt not available');
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        deferredPrompt = null;
      }
      
      return outcome;
    }
  };
}

function getPlatform(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'iOS';
  } else if (/android/.test(userAgent)) {
    return 'Android';
  } else if (/windows/.test(userAgent)) {
    return 'Windows';
  } else if (/mac/.test(userAgent)) {
    return 'macOS';
  } else {
    return 'Desktop';
  }
}

export function registerServiceWorker() {
  // Only register service worker in production
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  if (confirm('New version available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

export function checkOnlineStatus(): boolean {
  return navigator.onLine;
}

export function setupOnlineStatusListener(callback: (isOnline: boolean) => void) {
  callback(navigator.onLine);
  
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
  
  return () => {
    window.removeEventListener('online', () => callback(true));
    window.removeEventListener('offline', () => callback(false));
  };
}