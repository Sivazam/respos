import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface OfflineFallbackProps {
  onRetry?: () => void;
  isOnline?: boolean;
}

export function OfflineFallback({ onRetry, isOnline = false }: OfflineFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Offline Status Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            {isOnline ? (
              <Wifi className="w-8 h-8 text-green-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isOnline ? 'Reconnecting...' : 'Offline Mode'}
          </h1>
          <p className="text-gray-600">
            {isOnline 
              ? 'Connection restored. Refreshing the application...'
              : 'You are currently offline. Some features may not be available.'
            }
          </p>
        </div>

        {/* Alert Box */}
        <Alert variant={isOnline ? "default" : "destructive"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isOnline ? 'Connection Restored' : 'No Internet Connection'}
          </AlertTitle>
          <AlertDescription>
            {isOnline 
              ? 'The application is refreshing to sync the latest data.'
              : 'Please check your internet connection. You can continue using some features in offline mode.'
            }
          </AlertDescription>
        </Alert>

        {/* Available Features */}
        {!isOnline && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Available Offline:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View cached menu items</li>
              <li>• View existing orders</li>
              <li>• Basic table management</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mb-2 mt-4">Unavailable Offline:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time menu updates</li>
              <li>• Order synchronization</li>
              <li>• Payment processing</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onRetry} 
            className="flex-1"
            disabled={isOnline}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isOnline ? 'animate-spin' : ''}`} />
            {isOnline ? 'Refreshing...' : 'Retry Connection'}
          </Button>
          
          {!isOnline && (
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Reload App
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>If the problem persists, please contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}