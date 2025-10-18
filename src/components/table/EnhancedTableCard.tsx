import React from 'react';
import { Table as TableType, TableStatus } from '../../types';
import { Card } from '../ui/card';
import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  Armchair,
  Utensils,
  ChevronRight,
  User,
  Timer,
  Phone,
  Trash2,
  History,
  Edit,
  CalendarPlus,
  Unlock
} from 'lucide-react';

interface EnhancedTableCardProps {
  table: TableType;
  isSelected?: boolean;
  onClick?: () => void;
  showActions?: boolean;
  onEdit?: () => void;
  onReserve?: () => void;
  onRelease?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  compact?: boolean;
  editText?: string;
}

const EnhancedTableCard: React.FC<EnhancedTableCardProps> = ({
  table,
  isSelected = false,
  onClick,
  showActions = true,
  onEdit,
  onReserve,
  onRelease,
  onDelete,
  onHistory,
  compact = false,
  editText = 'Edit'
}) => {
  const getTableIcon = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return <Armchair className="w-5 h-5 text-green-600" />;
      case 'occupied':
        return <Utensils className="w-5 h-5 text-red-600" />;
      case 'reserved':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'maintenance':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Armchair className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTableStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available':
        return {
          border: 'border-green-200',
          background: 'bg-gradient-to-br from-green-50 to-emerald-50',
          header: 'bg-green-100',
          text: 'text-green-800',
          badge: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'occupied':
        return {
          border: 'border-red-200',
          background: 'bg-gradient-to-br from-red-50 to-rose-50',
          header: 'bg-red-100',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'reserved':
        return {
          border: 'border-blue-200',
          background: 'bg-gradient-to-br from-blue-50 to-indigo-50',
          header: 'bg-blue-100',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'maintenance':
        return {
          border: 'border-gray-200',
          background: 'bg-gradient-to-br from-gray-50 to-slate-50',
          header: 'bg-gray-100',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800 border-gray-200'
        };
      default:
        return {
          border: 'border-gray-200',
          background: 'bg-gradient-to-br from-gray-50 to-slate-50',
          header: 'bg-gray-100',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  };

  const getOccupiedDuration = (occupiedAt?: Date) => {
    if (!occupiedAt) return null;
    const now = new Date();
    const diff = now.getTime() - occupiedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getReservationTimeRemaining = (expiryAt?: Date) => {
    if (!expiryAt) return null;
    const now = new Date();
    const diff = expiryAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes <= 0) return 'Expired';
    return `${minutes}m`;
  };

  const colors = getTableStatusColor(table.status);
  const isCompact = compact;

  return (
    <Card 
      className={`
        relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl
        ${colors.border} ${colors.background} 
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${!isCompact ? 'hover:scale-[1.02]' : ''}
      `}
      onClick={onClick}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle size={16} className="text-white" />
          </div>
        </div>
      )}

      {/* Table Header with Icon */}
      <div className={`${colors.header} p-3 border-b border-opacity-20`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTableIcon(table.status)}
            <h3 className={`font-bold ${isCompact ? 'text-sm' : 'text-base'} ${colors.text}`}>
              {table.name}
            </h3>
          </div>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${colors.badge}`}>
            {table.status}
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className={`p-4 ${isCompact ? 'p-3' : ''}`}>
        {/* Capacity and Basic Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Users size={16} className="text-gray-500" />
            <span className={`font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>
              {table.capacity} seats
            </span>
          </div>
          {table.mergedWith && table.mergedWith.length > 0 && (
            <div className="flex items-center space-x-1 text-purple-600">
              <ChevronRight size={14} />
              <span className="text-xs font-medium">Merged</span>
            </div>
          )}
        </div>

        {/* Status-specific Details */}
        <div className="space-y-2">
          {table.status === 'occupied' && table.occupiedAt && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
              <Timer size={14} />
              <span className="font-medium">
                Occupied for {getOccupiedDuration(table.occupiedAt)}
              </span>
            </div>
          )}

          {table.status === 'reserved' && (
            <>
              {table.reservationDetails?.customerName && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-md">
                  <User size={14} />
                  <span className="font-medium truncate">
                    {table.reservationDetails.customerName}
                  </span>
                </div>
              )}
              {table.reservationDetails?.customerPhone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                  <Phone size={14} />
                  <span className="font-medium">
                    {table.reservationDetails.customerPhone}
                  </span>
                </div>
              )}
              {table.reservationExpiryAt && (
                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                  <Clock size={14} />
                  <span className="font-medium">
                    Expires in {getReservationTimeRemaining(table.reservationExpiryAt)}
                  </span>
                </div>
              )}
            </>
          )}

          {table.status === 'available' && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
              <CheckCircle size={14} />
              <span className="font-medium">Ready for guests</span>
            </div>
          )}

          {table.status === 'maintenance' && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
              <AlertCircle size={14} />
              <span className="font-medium">Under maintenance</span>
            </div>
          )}
        </div>

        {/* Order ID if available */}
        {table.currentOrderId && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-md">
              <Utensils size={14} />
              <span className="font-medium">
                Order: #{table.currentOrderId.slice(-8)}
              </span>
            </div>
          </div>
        )}

        {/* Merged Tables Info */}
        {table.mergedWith && table.mergedWith.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-md">
              <span className="font-medium">Merged with:</span>
              <div className="mt-1">{table.mergedWith.join(', ')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && !isCompact && (
        <div className="p-3 pt-0 flex gap-2 flex-wrap">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
            >
              {table.status === 'occupied' && table.currentOrderId ? <Utensils size={12} /> : <Edit size={12} />}
              <span className="hidden sm:inline">{editText}</span>
            </button>
          )}
          
          {onHistory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHistory();
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
            >
              <History size={12} />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
          
          {table.status === 'available' && onReserve && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReserve();
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
            >
              <CalendarPlus size={12} />
              <span className="hidden sm:inline">Reserve</span>
            </button>
          )}

          {(table.status === 'occupied' || table.status === 'reserved') && onRelease && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRelease();
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
            >
              <Unlock size={12} />
              <span className="hidden sm:inline">Release</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              title="Delete Table"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}
    </Card>
  );
};

export default EnhancedTableCard;