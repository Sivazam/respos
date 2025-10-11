import React, { useState, useEffect, useRef } from 'react';
import { useFranchises } from '../../contexts/FranchiseContext';
import { useAuth } from '../../contexts/AuthContext';
import { Building, ChevronDown } from 'lucide-react';

const FranchiseSelector: React.FC = () => {
  const { franchises, loading } = useFranchises();
  const { currentUser } = useAuth();
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set first franchise as default on load
  useEffect(() => {
    if (franchises.length > 0 && !selectedFranchise) {
      setSelectedFranchise(franchises[0].id);
    }
  }, [franchises, selectedFranchise]);

  // If no franchises are available
  if (loading) {
    return (
      <div className="flex items-center text-sm text-gray-600">
        <Building size={16} className="mr-1" />
        <span>Loading...</span>
      </div>
    );
  }

  if (franchises.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-600">
        <Building size={16} className="mr-1" />
        <span>No franchises available</span>
      </div>
    );
  }

  const currentFranchise = franchises.find(f => f.id === selectedFranchise);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none transition-colors duration-200 bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
      >
        <Building size={16} className="mr-1 text-gray-500" />
        <span className="mx-1">{currentFranchise?.name || 'Select Franchise'}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 animate-fadeIn">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {franchises.map(franchise => (
              <button
                key={franchise.id}
                onClick={() => {
                  setSelectedFranchise(franchise.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${
                  selectedFranchise === franchise.id
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                role="menuitem"
              >
                <div className="flex items-center">
                  <Building size={14} className="mr-2" />
                  <div className="flex-1">
                    <span>{franchise.name}</span>
                    <div className="text-xs text-gray-500">{franchise.ownerName}</div>
                  </div>
                  {!franchise.isActive && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FranchiseSelector;