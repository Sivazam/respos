import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerPWAInstallPrompt, type PWAInstallPrompt } from '@/utils/pwa';

export function PWAInstallPrompt() {
  const [pwa, setPwa] = useState<PWAInstallPrompt | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const pwaInstallPrompt = registerPWAInstallPrompt();
    setPwa(pwaInstallPrompt);

    // Check if user has previously dismissed the prompt
    const hasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (hasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    if (!pwa) return;

    try {
      await pwa.install();
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if:
  // - PWA is not ready yet
  // - App is already installed
  // - Not installable
  // - User has dismissed the prompt
  // - Not on mobile (optional - you can remove this if you want to show on desktop too)
  if (!pwa || pwa.isInstalled || !pwa.isInstallable || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 border-red-200 bg-white z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Smartphone className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Install App</CardTitle>
              <CardDescription className="text-xs">
                Available on {pwa.platform}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-3">
          Install our Restaurant POS app for a faster experience and offline access.
        </p>
        <Button 
          onClick={handleInstall} 
          className="w-full bg-red-600 hover:bg-red-700"
          size="sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      </CardContent>
    </Card>
  );
}