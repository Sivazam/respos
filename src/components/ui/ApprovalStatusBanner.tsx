import React from 'react';
import { AlertCircle, MapPin, UserCheck, RefreshCw } from 'lucide-react';
import { User } from '../../types';

interface ApprovalStatusBannerProps {
  currentUser: User;
  onRefresh?: () => void;
}

const ApprovalStatusBanner: React.FC<ApprovalStatusBannerProps> = ({ 
  currentUser, 
  onRefresh 
}) => {
  const getBannerContent = () => {
    // Super Admin - No restrictions
    if (currentUser.role === 'superadmin') {
      return null;
    }

    // Admin/Owner - Waiting for Super Admin approval
    if (currentUser.role === 'admin' || currentUser.role === 'owner') {
      if (!currentUser.isApproved) {
        return {
          type: 'warning' as const,
          icon: AlertCircle,
          title: 'Account Pending Approval',
          message: 'Your account is waiting for Super Administrator approval. You can view the dashboard but features are limited.',
          action: {
            text: 'Contact Super Admin',
            onClick: () => {
              // Could open email client or show contact info
              window.location.href = 'mailto:superadmin@company.com';
            }
          }
        };
      }
      
      if (!currentUser.isActive) {
        return {
          type: 'error' as const,
          icon: AlertCircle,
          title: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact the Super Administrator.',
          action: {
            text: 'Contact Support',
            onClick: () => {
              window.location.href = 'mailto:support@company.com';
            }
          }
        };
      }
    }

    // Manager - Waiting for Admin approval and location assignment
    if (currentUser.role === 'manager') {
      if (!currentUser.isApproved) {
        return {
          type: 'warning' as const,
          icon: UserCheck,
          title: 'Account Pending Approval',
          message: 'Your account is waiting for Administrator approval. You can view the dashboard but features are limited.',
          action: {
            text: 'Contact Admin',
            onClick: () => {
              window.location.href = 'mailto:admin@company.com';
            }
          }
        };
      }
      
      if (!currentUser.locationId) {
        return {
          type: 'info' as const,
          icon: MapPin,
          title: 'Location Assignment Required',
          message: 'You have been approved but need to be assigned to a location. Please contact your Administrator.',
          action: {
            text: 'Contact Admin',
            onClick: () => {
              window.location.href = 'mailto:admin@company.com';
            }
          }
        };
      }
      
      if (!currentUser.isActive) {
        return {
          type: 'error' as const,
          icon: AlertCircle,
          title: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact your Administrator.',
          action: {
            text: 'Contact Admin',
            onClick: () => {
              window.location.href = 'mailto:admin@company.com';
            }
          }
        };
      }
    }

    // Staff - Waiting for Manager approval and location assignment
    if (currentUser.role === 'staff') {
      if (!currentUser.isApproved) {
        return {
          type: 'warning' as const,
          icon: UserCheck,
          title: 'Account Pending Approval',
          message: 'Your account is waiting for Manager approval. You can view the dashboard but features are limited.',
          action: {
            text: 'Contact Manager',
            onClick: () => {
              window.location.href = 'mailto:manager@company.com';
            }
          }
        };
      }
      
      if (!currentUser.locationId) {
        return {
          type: 'info' as const,
          icon: MapPin,
          title: 'Location Assignment Required',
          message: 'You have been approved but need to be assigned to a location. Please contact your Manager.',
          action: {
            text: 'Contact Manager',
            onClick: () => {
              window.location.href = 'mailto:manager@company.com';
            }
          }
        };
      }
      
      if (!currentUser.isActive) {
        return {
          type: 'error' as const,
          icon: AlertCircle,
          title: 'Account Inactive',
          message: 'Your account has been deactivated. Please contact your Manager.',
          action: {
            text: 'Contact Manager',
            onClick: () => {
              window.location.href = 'mailto:manager@company.com';
            }
          }
        };
      }
    }

    return null;
  };

  const content = getBannerContent();
  
  if (!content) {
    return null;
  }

  const getBannerStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-6 ${getBannerStyles(content.type)}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <content.icon className={`h-5 w-5 ${getIconStyles(content.type)}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {content.title}
          </h3>
          <div className="mt-1 text-sm">
            <p>{content.message}</p>
          </div>
          <div className="mt-3 flex items-center space-x-3">
            {content.action && (
              <button
                onClick={content.action.onClick}
                className={`text-sm font-medium underline underline-offset-2 ${getIconStyles(content.type)} hover:opacity-80 transition-opacity`}
              >
                {content.action.text}
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className={`text-sm font-medium underline underline-offset-2 ${getIconStyles(content.type)} hover:opacity-80 transition-opacity flex items-center`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalStatusBanner;