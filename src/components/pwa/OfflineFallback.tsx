import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

interface OfflineFallbackProps {
  onRetry?: () => void;
  onGoHome?: () => void;
}

const OfflineFallback: React.FC<OfflineFallbackProps> = ({ 
  onRetry, 
  onGoHome 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Simulate network check
    try {
      const response = await fetch('/', { 
        method: 'HEAD',
        cache: 'no-cache' 
      });
      
      if (response.ok) {
        onRetry?.();
      }
    } catch (error) {
      console.error('Network check failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="bg-red-100 rounded-full p-6">
              <WifiOff className="w-16 h-16 text-red-600" />
            </div>
            {!isOnline && (
              <div className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You're offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          ForkFlow POS requires an internet connection to function properly. 
          Please check your connection and try again.
        </p>

        {/* Connection Status */}
        <div className="mb-8">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isOnline ? 'Connected' : 'Offline'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying || !isOnline}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium 
                     hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors duration-200 flex items-center justify-center"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Checking connection...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </>
            )}
          </button>

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium 
                       hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Go to Home
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">
            <strong>Troubleshooting tips:</strong>
          </p>
          <ul className="text-left space-y-1">
            <li>• Check your Wi-Fi or mobile data connection</li>
            <li>• Try moving to a location with better signal</li>
            <li>• Restart your router if using Wi-Fi</li>
            <li>• Contact your IT administrator if the problem persists</li>
          </ul>
        </div>

        {/* Offline Features Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong> Limited functionality:</strong> Some features may not work properly 
            while offline. Orders created offline will sync when you reconnect.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflineFallback;