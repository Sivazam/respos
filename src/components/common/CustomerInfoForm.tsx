import React from 'react';
import { User, Phone, MapPin } from 'lucide-react';

interface CustomerInfoFormProps {
  name?: string;
  phone?: string;
  city?: string;
  onChange: (values: { name?: string; phone?: string; city?: string }) => void;
  disabled?: boolean;
  showCollectedStatus?: boolean;
  collectedBy?: 'staff' | 'manager';
}

const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({
  name = '',
  phone = '',
  city = '',
  onChange,
  disabled = false,
  showCollectedStatus = false,
  collectedBy
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ name: e.target.value, phone, city });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric characters
    const value = e.target.value.replace(/[^0-9]/g, '');
    onChange({ name, phone: value, city });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ name, phone, city: e.target.value });
  };

  return (
    <div className="space-y-4">
      {/* Collected Status Badge */}
      {showCollectedStatus && collectedBy && (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-3">
          <User size={12} className="mr-1" />
          Collected by {collectedBy === 'staff' ? 'Staff' : 'Manager'}
        </div>
      )}

      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Customer Name
        </label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            disabled={disabled}
            placeholder="Enter customer name (optional)"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Phone Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={phone}
            onChange={handlePhoneChange}
            disabled={disabled}
            placeholder="Enter phone number (optional)"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* City Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          City
        </label>
        <div className="relative">
          <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={city}
            onChange={handleCityChange}
            disabled={disabled}
            placeholder="Enter city (optional)"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoForm;