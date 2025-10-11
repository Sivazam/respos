import React, { useState, useEffect } from 'react';
import { useTables } from '../../contexts/TableContext';
import { Table, TableReservationData } from '../../types';
import { 
  AlertCircle,
  RefreshCw,
  Link,
  Unlink,
  History
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import EnhancedTableCard from '../table/EnhancedTableCard';

const StaffTableManagement: React.FC = () => {
  const { 
    tables, 
    loading, 
    error, 
    reserveTable,
    releaseTable,
    mergeTables,
    splitTables,
    refreshTables 
  } = useTables();

  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [reservationData, setReservationData] = useState<TableReservationData>({
    customerName: '',
    customerPhone: '',
    notes: ''
  });

  // Auto-release expired reservations
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      tables.forEach(table => {
        if (
          table.status === 'reserved' && 
          table.reservationExpiryAt && 
          table.reservationExpiryAt < now
        ) {
          releaseTable(table.id);
          toast.success(`Reservation for ${table.name} has expired and been released`);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tables, releaseTable]);

  const handleReserveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    try {
      await reserveTable(selectedTable.id, reservationData);
      setShowReserveModal(false);
      setSelectedTable(null);
      setReservationData({ customerName: '', customerPhone: '', notes: '' });
      toast.success('Table reserved successfully');
    } catch (error) {
      toast.error('Failed to reserve table');
      console.error(error);
    }
  };

  const handleReleaseTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to release this table?')) return;

    try {
      await releaseTable(tableId);
      toast.success('Table released successfully');
    } catch (error) {
      toast.error('Failed to release table');
      console.error(error);
    }
  };

  const handleMergeTables = async () => {
    if (selectedTables.length < 2) {
      toast.error('Please select at least 2 tables to merge');
      return;
    }

    try {
      await mergeTables(selectedTables);
      setShowMergeModal(false);
      setSelectedTables([]);
      toast.success('Tables merged successfully');
    } catch (error) {
      toast.error('Failed to merge tables');
      console.error(error);
    }
  };

  const handleSplitTables = async () => {
    const mergedTables = tables.filter(table => table.mergedWith && table.mergedWith.length > 0);
    if (mergedTables.length === 0) {
      toast.error('No merged tables found');
      return;
    }

    try {
      const tableIds = mergedTables.map(table => table.id);
      await splitTables(tableIds);
      toast.success('Tables split successfully');
    } catch (error) {
      toast.error('Failed to split tables');
      console.error(error);
    }
  };

  const openReserveModal = (table: Table) => {
    setSelectedTable(table);
    setReservationData({ customerName: '', customerPhone: '', notes: '' });
    setShowReserveModal(true);
  };

  const openHistoryModal = (table: Table) => {
    setSelectedTable(table);
    setShowHistoryModal(true);
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-red-600">{error}</p>
        <Button onClick={refreshTables} className="mt-4">
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tables</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowMergeModal(true)} variant="outline" className="flex items-center gap-2">
            <Link size={20} />
            Merge Tables
          </Button>
          <Button onClick={handleSplitTables} variant="outline" className="flex items-center gap-2">
            <Unlink size={20} />
            Split All
          </Button>
          <Button onClick={refreshTables} variant="outline" className="flex items-center gap-2">
            <RefreshCw size={20} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <EnhancedTableCard
            key={table.id}
            table={table}
            isSelected={selectedTables.includes(table.id)}
            onClick={() => toggleTableSelection(table.id)}
            onReserve={() => openReserveModal(table)}
            onRelease={() => handleReleaseTable(table.id)}
            onEdit={() => openHistoryModal(table)}
            editText="Table History"
            showActions={true}
          />
        ))}
      </div>

      {/* Reserve Table Modal */}
      <Modal
        isOpen={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        title={`Reserve ${selectedTable?.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleReserveTable} className="space-y-6">
          <Input
            label="Customer Name"
            value={reservationData.customerName}
            onChange={(e) => setReservationData({ ...reservationData, customerName: e.target.value })}
            placeholder="Enter customer name"
          />
          
          <Input
            label="Customer Phone"
            value={reservationData.customerPhone}
            onChange={(e) => setReservationData({ ...reservationData, customerPhone: e.target.value })}
            placeholder="Enter phone number"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={reservationData.notes}
              onChange={(e) => setReservationData({ ...reservationData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Any special notes or requirements"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> This reservation will automatically expire in 2 hours.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Reserve Table
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReserveModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Merge Tables Modal */}
      <Modal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        title="Merge Tables"
        maxWidth="xl"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Tables to Merge
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tables.filter(t => t.status === 'available').map(table => (
                <label key={table.id} className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.id)}
                    onChange={() => toggleTableSelection(table.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{table.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({table.capacity} seats)</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedTables.length > 0 && (
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm text-green-700">
                <strong>Selected:</strong> {selectedTables.length} table(s)
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> First selected table will be the primary table. All tables will be treated as one large table.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleMergeTables} className="flex-1" disabled={selectedTables.length < 2}>
              Merge Tables
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMergeModal(false);
                setSelectedTables([]);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Table History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`${selectedTable?.name} - Order History`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Order history feature coming soon...</p>
            <p className="text-sm text-gray-400 mt-2">
              This will show recent orders, total revenue, and occupancy statistics for this table.
            </p>
          </div>
          
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffTableManagement;