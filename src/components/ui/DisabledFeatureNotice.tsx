import React from 'react';
import { AlertCircle } from 'lucide-react';

interface DisabledFeatureNoticeProps {
  featureName: string;
  reason?: string;
  className?: string;
}

const DisabledFeatureNotice: React.FC<DisabledFeatureNoticeProps> = ({
  featureName,
  reason = 'This feature is currently disabled for this store configuration.',
  className = ''
}) => {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-6 text-center ${className}`}>
      <div className="flex justify-center mb-3">
        <AlertCircle className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="text-lg font-medium text-amber-900 mb-2">
        {featureName} Unavailable
      </h3>
      <p className="text-amber-700 text-sm">
        {reason}
      </p>
    </div>
  );
};

export default DisabledFeatureNotice;