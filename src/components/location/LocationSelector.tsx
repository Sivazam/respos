import React, { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';

const LocationSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth();
  const { locations } = useLocations();

  // Only show for admin users
  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  // Get locations for this admin's franchise
  const franchiseLocations = locations.filter(loc => loc.franchiseId === currentUser.franchiseId);
  
  if (franchiseLocations.length === 0) {
    return null;
  }

  // If only one location, show it as a display (not a dropdown)
  if (franchiseLocations.length === 1) {
    const singleLocation = franchiseLocations[0];
    return (
      <div className="flex items-center text-sm text-gray-600 px-3 py-2">
        <MapPin size={16} className="mr-2" />
        <span>{singleLocation.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
      >
        <MapPin size={16} className="mr-2" />
        <span>Locations ({franchiseLocations.length})</span>
        <ChevronDown size={16} className="ml-2" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your Locations
              </div>
              {franchiseLocations.map((location) => (
                <div
                  key={location.id}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-200"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2 text-gray-400" />
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-xs text-gray-500">{location.address}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LocationSelector;