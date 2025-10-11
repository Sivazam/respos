import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTables } from '../../contexts/TableContext';
import TableSelection from '../../components/order/TableSelection';

const TableSelectionPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshTables } = useTables();

  const [isModalOpen, setIsModalOpen] = useState(true);

  // Get order type and ongoing status from navigation state
  const orderType = location.state?.orderType || 'dinein';
  const isOngoing = location.state?.isOngoing || false;

  const handleClose = () => {
    setIsModalOpen(false);
    // Navigate back to the previous page
    const fromLocation = location.state?.fromLocation || '/manager';
    navigate(fromLocation);
  };

  // Refresh tables when component mounts
  React.useEffect(() => {
    refreshTables();
  }, [refreshTables]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors mr-4"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {isOngoing ? 'Ongoing Order' : 'New Order'} - Table Selection
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              Order Type: <span className="font-medium">{orderType === 'dinein' ? 'Dine-in' : 'Delivery'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Selection Modal */}
      <TableSelection
        isOpen={isModalOpen}
        onClose={handleClose}
        orderType={orderType}
        isOngoing={isOngoing}
      />
    </div>
  );
};

export default TableSelectionPage;