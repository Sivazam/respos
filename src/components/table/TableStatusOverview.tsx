import React from 'react';
import { useTables } from '../../contexts/TableContext';
import { Card } from '../ui/card';
import { 
  Coffee, 
  Utensils, 
  Calendar, 
  AlertCircle,
  Users,
  ChevronRight
} from 'lucide-react';

const TableStatusOverview: React.FC = () => {
  const { tables } = useTables();

  const availableTables = tables.filter(table => table.status === 'available').length;
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;
  const reservedTables = tables.filter(table => table.status === 'reserved').length;
  const maintenanceTables = tables.filter(table => table.status === 'maintenance').length;
  const totalTables = tables.length;
  const tableOccupancyRate = totalTables > 0 ? (occupiedTables / totalTables) * 100 : 0;

  const statusItems = [
    {
      label: 'Available',
      count: availableTables,
      icon: Coffee,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200'
    },
    {
      label: 'Occupied',
      count: occupiedTables,
      icon: Utensils,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200'
    },
    {
      label: 'Reserved',
      count: reservedTables,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Maintenance',
      count: maintenanceTables,
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200'
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Table Status Overview</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users size={16} />
          <span>{totalTables} total tables</span>
        </div>
      </div>

      <div className="space-y-4">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between p-3 rounded-lg border ${item.borderColor} ${item.bgColor} transition-all hover:shadow-sm`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-md ${item.bgColor}`}>
                <item.icon size={20} className={item.color} />
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-600">
                  {totalTables > 0 ? `${((item.count / totalTables) * 100).toFixed(0)}% of tables` : 'No tables'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        ))}

        {/* Occupancy Rate Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Occupancy Rate</p>
              <p className="text-xs text-gray-600">Current utilization</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">{tableOccupancyRate.toFixed(0)}%</p>
              <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                <div 
                  className="h-2 bg-purple-600 rounded-full transition-all duration-300"
                  style={{ width: `${tableOccupancyRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TableStatusOverview;