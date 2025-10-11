import React, { ReactNode } from 'react';
import { useFeatures } from '../../hooks/useFeatures';

interface FeatureGuardProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showDisabledMessage?: boolean;
  disabledMessage?: string;
}

// Component to conditionally render content based on feature flags
const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  fallback = null,
  showDisabledMessage = false,
  disabledMessage = 'This feature is currently disabled'
}) => {
  const { isEnabled } = useFeatures();
  
  if (isEnabled(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showDisabledMessage) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-600 text-sm">{disabledMessage}</p>
      </div>
    );
  }
  
  return null;
};

export default FeatureGuard;