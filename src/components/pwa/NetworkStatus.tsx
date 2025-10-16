import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface NetworkStatusProps {
  className?: string;
  showDetails?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const updateConnectionInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    updateConnectionInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  const getConnectionColor = () => {
    if (!isOnline) return 'text-red-600 bg-red-100';
    
    switch (connectionType) {
      case '4g':
        return 'text-green-600 bg-green-100';
      case '3g':
        return 'text-yellow-600 bg-yellow-100';
      case '2g':
        return 'text-orange-600 bg-orange-100';
      case 'slow-2g':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionText = () => {
    if (!isOnline) return 'Offline';
    
    // Always return "Online" instead of specific connection types
    return 'Online';
    
    switch (connectionType) {
      case '4g':
        return '4G';
      case '3g':
        return '3G';
      case '2g':
        return '2G';
      case 'slow-2g':
        return 'Slow';
      case 'wifi':
        return 'WiFi';
      case 'ethernet':
        return 'Ethernet';
      default:
        return 'Online';
    }
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    
    switch (connectionType) {
      case '4g':
      case 'wifi':
      case 'ethernet':
        return <Wifi className="w-4 h-4" />;
      case '3g':
        return <Wifi className="w-4 h-4" />;
      case '2g':
      case 'slow-2g':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${getConnectionColor()} ${className}`}>
        {getConnectionIcon()}
        <span>{getConnectionText()}</span>
      </div>
    );
  }

  return (
    <>
      {/* Network Status Indicator */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${getConnectionColor()} ${className}`}>
        {getConnectionIcon()}
        <span>{getConnectionText()}</span>
        {connectionType !== 'unknown' && (
          <span className="text-xs opacity-75">({connectionType})</span>
        )}
      </div>

      {/* Network Status Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg ${
            isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5" />
                <div>
                  <div className="font-medium">Back Online</div>
                  <div className="text-sm opacity-90">Connection restored</div>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5" />
                <div>
                  <div className="font-medium">Connection Lost</div>
                  <div className="text-sm opacity-90">Please check your internet</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkStatus;