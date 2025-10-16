import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Wifi, WifiOff, Download, Smartphone } from 'lucide-react';

export function PWATest() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [manifestSupported, setManifestSupported] = useState(false);

  useEffect(() => {
    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check PWA support
    setServiceWorkerSupported('serviceWorker' in navigator);
    setManifestSupported('manifest' in document.documentElement || 'onbeforeinstallprompt' in window);

    // Check if app is installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const features = [
    {
      name: 'Online Status',
      supported: isOnline,
      icon: isOnline ? Wifi : WifiOff,
      description: isOnline ? 'Connected to internet' : 'Offline mode'
    },
    {
      name: 'Service Worker',
      supported: serviceWorkerSupported,
      icon: serviceWorkerSupported ? CheckCircle : XCircle,
      description: serviceWorkerSupported ? 'Service worker API available' : 'Service worker not supported'
    },
    {
      name: 'Web App Manifest',
      supported: manifestSupported,
      icon: manifestSupported ? CheckCircle : XCircle,
      description: manifestSupported ? 'Web app manifest available' : 'Manifest not supported'
    },
    {
      name: 'Installable',
      supported: isInstallable,
      icon: isInstallable ? Download : XCircle,
      description: isInstallable ? 'App can be installed' : 'Install prompt not available'
    },
    {
      name: 'Installed',
      supported: isInstalled,
      icon: isInstalled ? Smartphone : XCircle,
      description: isInstalled ? 'App is installed' : 'App not installed'
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          PWA Status Check
        </CardTitle>
        <CardDescription>
          Progressive Web App functionality and compatibility status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${feature.supported ? 'text-green-600' : 'text-red-600'}`} />
                  <div>
                    <h4 className="font-medium">{feature.name}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
                <Badge variant={feature.supported ? 'default' : 'destructive'}>
                  {feature.supported ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">PWA Features Enabled:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Offline caching with service worker</li>
            <li>• Installable on supported devices</li>
            <li>• App-like experience with standalone mode</li>
            <li>• Background sync for API calls</li>
            <li>• Responsive design for all screen sizes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}