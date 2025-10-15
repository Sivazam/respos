import React, { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import Button from '../ui/Button';
import { Trash2, Download, Eye, AlertTriangle } from 'lucide-react';
import { 
  getStorageStats, 
  cleanupStorage, 
  cleanupOrderData, 
  cleanupTemporaryOrderData,
  safeCleanup,
  checkForDuplicateOrderData,
  exportStorageData,
  getOrderRelatedKeys
} from '../../utils/storageCleanup';

interface LocalStorageDebugProps {
  onClose?: () => void;
}

const LocalStorageDebug: React.FC<LocalStorageDebugProps> = ({ onClose }) => {
  const [storageData, setStorageData] = useState<{ [key: string]: string }>({});
  const [showDetails, setShowDetails] = useState(false);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [duplicates, setDuplicates] = useState<any>(null);

  useEffect(() => {
    loadStorageData();
    loadStorageStats();
    checkDuplicates();
  }, []);

  const loadStorageData = () => {
    const data: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        data[key] = value;
      }
    }
    setStorageData(data);
  };

  const loadStorageStats = () => {
    const stats = getStorageStats();
    setStorageStats(stats);
  };

  const checkDuplicates = () => {
    const duplicateData = checkForDuplicateOrderData();
    setDuplicates(duplicateData);
  };

  const clearAllStorage = () => {
    if (confirm('Are you sure you want to clear ALL localStorage data? This action cannot be undone.')) {
      const removedKeys = cleanupStorage({ clearAll: true });
      loadStorageData();
      loadStorageStats();
      checkDuplicates();
      alert(`Cleared ${removedKeys.length} localStorage keys!`);
    }
  };

  const clearOrderRelatedStorage = () => {
    const orderKeys = getOrderRelatedKeys();
    
    if (orderKeys.length === 0) {
      alert('No order-related localStorage keys found.');
      return;
    }
    
    if (confirm(`Found ${orderKeys.length} order-related keys. Clear them?`)) {
      const removedKeys = cleanupOrderData();
      loadStorageData();
      loadStorageStats();
      checkDuplicates();
      alert(`Cleared ${removedKeys.length} order-related keys!`);
    }
  };

  const clearTemporaryOrderStorage = () => {
    if (confirm('Clear all temporary order data? This will remove any unsaved orders.')) {
      const removedKeys = cleanupTemporaryOrderData();
      loadStorageData();
      loadStorageStats();
      checkDuplicates();
      alert(`Cleared ${removedKeys.length} temporary order keys!`);
    }
  };

  const performSafeCleanup = () => {
    if (confirm('Perform safe cleanup? This will only remove potentially problematic data.')) {
      const removedKeys = safeCleanup();
      loadStorageData();
      loadStorageStats();
      checkDuplicates();
      alert(`Safe cleanup completed. Removed ${removedKeys.length} keys.`);
    }
  };

  const exportStorageDataToFile = () => {
    const dataStr = exportStorageData();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `localStorage-debug-${new Date().toISOString().slice(0, 19)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const isOrderRelated = (key: string) => {
    return key.startsWith('temp_order_') ||
           key.startsWith('manager_pending_') ||
           key.startsWith('restaurant_temporary_order') ||
           key.startsWith('order_') ||
           key.startsWith('table_') ||
           key.startsWith('cart_');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Local Storage Debug</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  loadStorageData();
                  loadStorageStats();
                  checkDuplicates();
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye size={16} />
                Refresh
              </Button>
              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Eye size={16} />
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
              <Button
                onClick={exportStorageDataToFile}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </Button>
              <Button
                onClick={performSafeCleanup}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-green-600 border-green-300"
              >
                <Trash2 size={16} />
                Safe Cleanup
              </Button>
              <Button
                onClick={clearTemporaryOrderStorage}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-yellow-600 border-yellow-300"
              >
                <Trash2 size={16} />
                Clear Temp Orders
              </Button>
              <Button
                onClick={clearOrderRelatedStorage}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-orange-600 border-orange-300"
              >
                <Trash2 size={16} />
                Clear Orders
              </Button>
              <Button
                onClick={clearAllStorage}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-red-600 border-red-300"
              >
                <Trash2 size={16} />
                Clear All
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {/* Storage Statistics */}
          {storageStats && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Storage Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Keys:</span>
                  <span className="ml-2 text-blue-700">{storageStats.totalKeys}</span>
                </div>
                <div>
                  <span className="font-medium">Order-related:</span>
                  <span className="ml-2 text-orange-700">{storageStats.orderRelatedKeys}</span>
                </div>
                <div>
                  <span className="font-medium">Table-related:</span>
                  <span className="ml-2 text-green-700">{storageStats.tableRelatedKeys}</span>
                </div>
                <div>
                  <span className="font-medium">User-related:</span>
                  <span className="ml-2 text-purple-700">{storageStats.userRelatedKeys}</span>
                </div>
                <div>
                  <span className="font-medium">Cache-related:</span>
                  <span className="ml-2 text-gray-700">{storageStats.cacheRelatedKeys}</span>
                </div>
                <div>
                  <span className="font-medium">Debug-related:</span>
                  <span className="ml-2 text-red-700">{storageStats.debugRelatedKeys}</span>
                </div>
                <div>
                  <span className="font-medium">Other:</span>
                  <span className="ml-2 text-gray-600">{storageStats.otherKeys}</span>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Detection */}
          {duplicates && duplicates.duplicates.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Duplicate Order Data Detected
              </h3>
              <p className="text-sm text-red-700 mb-2">
                Found {duplicates.duplicates.length} order(s) with duplicate localStorage entries
              </p>
              <div className="space-y-2">
                {duplicates.details.map((detail: any, index: number) => (
                  <div key={index} className="text-sm bg-red-100 p-2 rounded">
                    <span className="font-medium">Order {detail.orderId}:</span> {detail.count} entries
                    <div className="text-xs text-red-600 mt-1">
                      Keys: {detail.keys.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={clearTemporaryOrderStorage}
                variant="outline"
                size="sm"
                className="mt-3 text-red-600 border-red-300"
              >
                Clear Duplicate Data
              </Button>
            </div>
          )}

          {/* Legacy Stats */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total localStorage keys: {Object.keys(storageData).length}
            </p>
            <p className="text-sm text-gray-600">
              Order-related keys: {Object.keys(storageData).filter(key => isOrderRelated(key)).length}
            </p>
          </div>
          
          {Object.keys(storageData).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No localStorage data found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(storageData).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border ${
                    isOrderRelated(key)
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">
                      {key}
                      {isOrderRelated(key) && (
                        <span className="ml-2 px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded">
                          Order-related
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {value.length} characters
                    </span>
                  </div>
                  
                  {showDetails && (
                    <div className="mt-2">
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {formatValue(value).substring(0, 500)}
                        {formatValue(value).length > 500 && '...'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LocalStorageDebug;