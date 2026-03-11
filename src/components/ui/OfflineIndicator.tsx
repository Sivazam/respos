import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isVisible, setIsVisible] = useState(!navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);

            // Show syncing state briefly before hiding
            setTimeout(() => {
                setIsSyncing(false);
                setIsVisible(false);
            }, 2500);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setIsVisible(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`shadow-lg rounded-full px-4 py-2 flex items-center gap-3 transition-colors duration-300 ${isOnline ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
                {!isOnline ? (
                    <>
                        <WifiOff className="w-4 h-4" />
                        <span className="text-sm font-medium whitespace-nowrap">
                            Offline Mode • Orders will sync when online
                        </span>
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium whitespace-nowrap">
                            Back online! Syncing data...
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

export default OfflineIndicator;
