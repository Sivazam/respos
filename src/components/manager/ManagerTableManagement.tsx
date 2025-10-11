import React, { useState, useEffect } from 'react';
import { useTables } from '../../contexts/TableContext';
import { Table, TableFormData, TableReservationData } from '../../types';
import { 
  Plus, 
  AlertCircle,
  RefreshCw,
  ArrowLeftRight,
  Link,
  Unlink,
  Clock
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import EnhancedTableCard from '../table/EnhancedTableCard';

const ManagerTableManagement: React.FC = () => {
  const { 
    tables, 
    loading, 
    error, 
    createTable, 
    updateTable, 
    deleteTable, 
    reserveTable,
    releaseTable,
    switchTable,
    mergeTables,
    splitTables,
    refreshTables 
  } = useTables();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [formData, setFormData] = useState<TableFormData>({
    name: '',
    capacity: 4,
    status: 'available'
  });
  const [reservationData, setReservationData] = useState<TableReservationData>({
    customerName: '',
    customerPhone: '',
    notes: ''
  });
  const [switchData, setSwitchData] = useState({
    fromTableId: '',
    toTableId: ''
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

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTable(formData);
      setShowCreateModal(false);
      setFormData({ name: '', capacity: 4, status: 'available' });
      toast.success('Table created successfully');
    } catch (error) {
      toast.error('Failed to create table');
      console.error(error);
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    try {
      await updateTable(selectedTable.id, formData);
      setShowEditModal(false);
      setSelectedTable(null);
      setFormData({ name: '', capacity: 4, status: 'available' });
      toast.success('Table updated successfully');
    } catch (error) {
      toast.error('Failed to update table');
      console.error(error);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table?')) return;

    try {
      await deleteTable(tableId);
      toast.success('Table deleted successfully');
    } catch (error) {
      toast.error('Failed to delete table');
      console.error(error);
    }
  };

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
    try {
      await releaseTable(tableId);
      toast.success('Table released successfully');
    } catch (error) {
      toast.error('Failed to release table');
      console.error(error);
    }
  };

  const handleSwitchTable = async () => {
    if (!switchData.fromTableId || !switchData.toTableId) {
      toast.error('Please select both source and target tables');
      return;
    }

    try {
      await switchTable(switchData.fromTableId, switchData.toTableId);
      setShowSwitchModal(false);
      setSwitchData({ fromTableId: '', toTableId: '' });
      toast.success('Table switched successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to switch table');
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

  const openEditModal = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      name: table.name,
      capacity: table.capacity,
      status: table.status
    });
    setShowEditModal(true);
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
        <h2 className="text-2xl font-bold text-gray-900">Table Management</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2" title="Add Table">
            <Plus size={20} />
            <span className="hidden sm:inline">Add Table</span>
          </Button>
          <Button onClick={() => setShowSwitchModal(true)} variant="outline" className="flex items-center gap-2" title="Switch Table">
            <ArrowLeftRight size={20} />
            <span className="hidden sm:inline">Switch</span>
          </Button>
          <Button onClick={() => setShowMergeModal(true)} variant="outline" className="flex items-center gap-2" title="Merge Tables">
            <Link size={20} />
            <span className="hidden sm:inline">Merge</span>
          </Button>
          <Button 
            onClick={handleSplitTables} 
            variant="outline" 
            className="flex items-center gap-2 relative group"
            title="Split all merged tables back to individual tables"
          >
            <Unlink size={20} />
            <span className="hidden sm:inline">Split All</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Split all merged tables back to individual tables
            </div>
          </Button>
          <Button onClick={refreshTables} variant="outline" className="flex items-center gap-2" title="Refresh Tables">
            <RefreshCw size={20} />
            <span className="hidden sm:inline">Refresh</span>
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
            onEdit={() => openEditModal(table)}
            onHistory={() => openHistoryModal(table)}
            onReserve={() => openReserveModal(table)}
            onRelease={() => handleReleaseTable(table.id)}
            onDelete={() => handleDeleteTable(table.id)}
            editText="Edit Table"
          />
        ))}
      </div>

      {/* Create Table Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Table"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTable} className="space-y-6">
          <Input
            label="Table Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g., Table 1, Corner Table"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacity
            </label>
            <select
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            >
              <option value={2}>2 seats</option>
              <option value={4}>4 seats</option>
              <option value={6}>6 seats</option>
              <option value={8}>8 seats</option>
              <option value={10}>10 seats</option>
              <option value={12}>12 seats</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Create Table
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Table Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Table"
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateTable} className="space-y-6">
          <Input
            label="Table Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Capacity
            </label>
            <select
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            >
              <option value={2}>2 seats</option>
              <option value={4}>4 seats</option>
              <option value={6}>6 seats</option>
              <option value={8}>8 seats</option>
              <option value={10}>10 seats</option>
              <option value={12}>12 seats</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Table['status'] })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            >
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Update Table
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

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

      {/* Switch Table Modal */}
      <Modal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        title="Switch Table"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Table (Occupied)
            </label>
            <select
              value={switchData.fromTableId}
              onChange={(e) => setSwitchData({ ...switchData, fromTableId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select occupied table</option>
              {tables.filter(t => t.status === 'occupied').map(table => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Table (Available)
            </label>
            <select
              value={switchData.toTableId}
              onChange={(e) => setSwitchData({ ...switchData, toTableId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select available table</option>
              {tables.filter(t => t.status === 'available').map(table => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-yellow-50 p-3 rounded-md">
            <p className="text-sm text-yellow-700">
              <strong>Note:</strong> This will move the current order and customer to the new table.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSwitchTable} className="flex-1">
              Switch Table
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSwitchModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
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

      {/* Order History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`${selectedTable?.name} - Order History`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order History</h3>
            <p className="text-gray-500 mb-4">
              Detailed order history and analytics for {selectedTable?.name}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Today's Orders</p>
                <p className="text-2xl font-bold text-blue-900">0</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">₹0</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Avg. Order Value</p>
                <p className="text-2xl font-bold text-purple-900">₹0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <strong>Coming Soon:</strong> This will show detailed order history, customer analytics, peak hours, and revenue trends for this specific table.
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

export default ManagerTableManagement;