import React from 'react';
import { Smartphone, Package, Store } from 'lucide-react';

interface OrderModeSelectionProps {
  selectedMode: 'zomato' | 'swiggy' | 'in-store';
  onModeChange: (mode: 'zomato' | 'swiggy' | 'in-store') => void;
}

const OrderModeSelection: React.FC<OrderModeSelectionProps> = ({
  selectedMode,
  onModeChange
}) => {
  const modes = [
    {
      value: 'zomato' as const,
      label: 'Zomato',
      icon: <Smartphone size={24} />,
      color: 'zomato',
      description: 'Order from Zomato platform'
    },
    {
      value: 'swiggy' as const,
      label: 'Swiggy',
      icon: <Package size={24} />,
      color: 'swiggy',
      description: 'Order from Swiggy platform'
    },
    {
      value: 'in-store' as const,
      label: 'In-Store',
      icon: <Store size={24} />,
      color: 'in-store',
      description: 'Direct in-store delivery order'
    }
  ];

  const getModeStyles = (mode: string) => {
    switch (mode) {
      case 'zomato':
        return selectedMode === 'zomato'
          ? 'bg-pink-100 border-pink-300 text-pink-800'
          : 'bg-gray-50 border-gray-200 hover:bg-pink-50 hover:border-pink-200';
      case 'swiggy':
        return selectedMode === 'swiggy'
          ? 'bg-orange-100 border-orange-300 text-orange-800'
          : 'bg-gray-50 border-gray-200 hover:bg-orange-50 hover:border-orange-200';
      case 'in-store':
        return selectedMode === 'in-store'
          ? 'bg-blue-100 border-blue-300 text-blue-800'
          : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getIconColor = (mode: string) => {
    switch (mode) {
      case 'zomato':
        return selectedMode === 'zomato' ? 'text-pink-600' : 'text-gray-400';
      case 'swiggy':
        return selectedMode === 'swiggy' ? 'text-orange-600' : 'text-gray-400';
      case 'in-store':
        return selectedMode === 'in-store' ? 'text-blue-600' : 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Order Mode</h3>
        <p className="text-sm text-gray-600">Select the platform for this delivery order</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${getModeStyles(
              mode.value
            )}`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className={getIconColor(mode.value)}>
                {mode.icon}
              </div>
              <h4 className="font-semibold">{mode.label}</h4>
            </div>
            <p className="text-sm opacity-80">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OrderModeSelection;