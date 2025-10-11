import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useTables } from '../../contexts/TableContext';
import { Table } from '../../types';
import { 
  X,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import Button from '../ui/Button';
import EnhancedTableCard from '../table/EnhancedTableCard';

interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'dinein' | 'delivery';
  isOngoing: boolean;
}

const TableSelection: React.FC<TableSelectionProps> = ({
  isOpen,
  onClose,
  orderType,
  isOngoing
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    tables, 
    loading, 
    error, 
    getAvailableTables, 
    getOccupiedTables,
    refreshTables 
  } = useTables();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);

  // Filter tables based on order flow
  useEffect(() => {
    if (isOngoing) {
      // Show only occupied tables for ongoing orders
      const occupied = getOccupiedTables();
      console.log('Occupied tables for ongoing orders:', occupied);
      setFilteredTables(occupied);
    } else {
      // Show available and reserved tables for new orders
      const available = tables.filter(table => 
        table.status === 'available' || table.status === 'reserved'
      );
      console.log('Available tables for new orders:', available);
      setFilteredTables(available);
    }
  }, [isOngoing, tables, getAvailableTables, getOccupiedTables]);

  const handleTableSelect = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleProceedToPOS = (tableIds: string[]) => {
    onClose();
    
    // Navigate to POS with order context
    navigate('/pos', { 
      state: { 
        orderType,
        tableIds,
        isOngoing,
        fromLocation: location.state?.fromLocation || '/manager'
      } 
    });
  };

  // If delivery, skip table selection and go directly to POS
  useEffect(() => {
    if (orderType === 'delivery' && isOpen) {
      handleProceedToPOS([]);
    }
  }, [orderType, isOpen, handleProceedToPOS]);

  if (!isOpen) return null;

  // For delivery orders, show loading state briefly before redirecting
  if (orderType === 'delivery') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <RefreshCw className="animate-spin h-8 w-8 text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Setting up delivery order...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedTables([])}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isOngoing ? 'Select Ongoing Table' : 'Select Table(s)'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isOngoing 
                    ? 'Choose a table with an ongoing order to add more items'
                    : 'Choose table(s) for new customers (can select multiple for large groups)'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <p className="text-red-600">{error}</p>
                <Button onClick={refreshTables} className="mt-4">
                  Refresh
                </Button>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {isOngoing 
                    ? 'No tables with ongoing orders found'
                    : 'No available tables found'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {isOngoing 
                    ? 'Start a new order first to create ongoing orders'
                    : 'All tables are currently occupied or reserved'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Selection Info */}
                {selectedTables.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-700">
                        <strong>Selected:</strong> {selectedTables.length} table(s)
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleProceedToPOS(selectedTables)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Proceed to POS
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tables Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredTables.map((table) => (
                    <EnhancedTableCard
                      key={table.id}
                      table={table}
                      isSelected={selectedTables.includes(table.id)}
                      onClick={() => handleTableSelect(table.id)}
                      compact={true}
                      showActions={false}
                    />
                  ))}
                </div>

                {/* Multi-selection Help */}
                {!isOngoing && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> You can select multiple tables for large groups. All selected tables will be treated as one order.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            
            {selectedTables.length > 0 && (
              <Button
                onClick={() => handleProceedToPOS(selectedTables)}
                className="bg-green-600 hover:bg-green-700"
              >
                Proceed to POS ({selectedTables.length} table{selectedTables.length > 1 ? 's' : ''})
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSelection;