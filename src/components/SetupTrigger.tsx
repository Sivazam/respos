import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import InitialSetupWizard from './InitialSetupWizard';
import { useLocations } from '../contexts/LocationContext';

const SetupTrigger: React.FC = () => {
  const { currentUser, needsSetup, completeSetup } = useAuth();
  const { locations } = useLocations();

  // Only show setup wizard for admin/manager users who need setup
  const shouldShowSetup = () => {
    if (!currentUser || !needsSetup) return false;
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') return false;
    if (!currentUser.locationId) return false;
    
    // Check if the location exists
    const location = locations.find(loc => loc.id === currentUser.locationId);
    return !!location;
  };

  const handleSetupComplete = () => {
    completeSetup();
  };

  if (!shouldShowSetup()) {
    return null;
  }

  return (
    <InitialSetupWizard
      isOpen={true}
      onComplete={handleSetupComplete}
      locationId={currentUser.locationId!}
      userId={currentUser.uid}
    />
  );
};

export default SetupTrigger;