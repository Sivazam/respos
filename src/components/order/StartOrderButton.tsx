import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Button from '../ui/Button';
import OrderTypeSelection from './OrderTypeSelection';

interface StartOrderButtonProps {
  className?: string;
}

const StartOrderButton: React.FC<StartOrderButtonProps> = ({ className = '' }) => {
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleStartOrder = () => {
    setShowOrderTypeModal(true);
  };

  const handleOrderTypeSelect = (orderType: 'dinein' | 'delivery', isOngoing: boolean = false) => {
    setShowOrderTypeModal(false);
    
    // Determine if we're in manager context
    const isManager = location.pathname.startsWith('/manager');
    const fromLocation = isManager ? '/manager' : '/staff';
    
    // Navigate to table selection with order type and ongoing status
    navigate('/select-table', { 
      state: { 
        orderType, 
        isOngoing,
        fromLocation
      } 
    });
  };

  return (
    <>
      {/* Floating Start Order Button */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={handleStartOrder}
          size="lg"
          className="rounded-full w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white"
          title="Start Order"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* Order Type Selection Modal */}
      <OrderTypeSelection
        isOpen={showOrderTypeModal}
        onClose={() => setShowOrderTypeModal(false)}
        onSelect={handleOrderTypeSelect}
      />
    </>
  );
};

export default StartOrderButton;