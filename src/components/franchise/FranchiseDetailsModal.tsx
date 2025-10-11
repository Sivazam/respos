import React from 'react';
import { format } from 'date-fns';
import { X, Building2, User, Mail, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Franchise } from '../../types';

interface FranchiseDetailsModalProps {
  franchise: Franchise;
  onClose: () => void;
}

const FranchiseDetailsModal: React.FC<FranchiseDetailsModalProps> = ({ franchise, onClose }) => {
  // Helper function to safely get plan badge color
  const getPlanBadgeColor = (plan: string | undefined) => {
    switch (plan) {
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to safely display plan name
  const getPlanDisplayName = (plan: string | undefined) => {
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'N/A';
  };

  // Helper function to safely get subscription status badge color
  const getStatusBadgeColor = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Safe access to franchise properties
  const subscriptionPlan = franchise.subscriptionPlan || franchise.plan;
  const subscriptionStatus = franchise.subscriptionStatus || 'unknown';
  const monthlyFee = franchise.monthlyFee || 0;
  const commissionRate = franchise.commissionRate || 0;
  const settings = franchise.settings || {};
  const features = settings.features || franchise.features || {};
  const branding = franchise.branding || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Franchise Details</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Franchise Name</label>
                    <p className="text-gray-900">{franchise.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Name</label>
                    <p className="text-gray-900">{franchise.businessName || franchise.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{franchise.address}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Owner Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner Name</label>
                    <p className="text-gray-900">{franchise.ownerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Owner Email</label>
                    <p className="text-gray-900">{franchise.ownerEmail || franchise.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{franchise.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{franchise.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription & Status */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Plan</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(subscriptionPlan)}`}>
                      {getPlanDisplayName(subscriptionPlan)}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(subscriptionStatus)}`}>
                      {subscriptionStatus}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Monthly Fee</label>
                    <p className="text-gray-900">₹{monthlyFee}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Commission Rate</label>
                    <p className="text-gray-900">{commissionRate}%</p>
                  </div>
                  {franchise.subscriptionStartDate && franchise.subscriptionEndDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Subscription Period</label>
                      <p className="text-gray-900">
                        {format(franchise.subscriptionStartDate, 'MMM dd, yyyy')} - {format(franchise.subscriptionEndDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">GST Number</label>
                    <p className="text-gray-900">{franchise.gstNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">PAN Number</label>
                    <p className="text-gray-900">{franchise.panNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">License Number</label>
                    <p className="text-gray-900">{franchise.licenseNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Approval Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      franchise.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {franchise.isApproved ? 'Approved' : 'Pending Approval'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Active Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      franchise.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {franchise.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created Date</label>
                    <p className="text-gray-900">{format(franchise.createdAt, 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {franchise.approvedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Approved Date</label>
                      <p className="text-gray-900">{format(franchise.approvedAt, 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feature Limits */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Limits & Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Limits</h4>
                <div className="space-y-1 text-sm">
                  <p>Max Users: {settings.maxUsers || 'Unlimited'}</p>
                  <p>Max Products: {settings.maxProducts || 'Unlimited'}</p>
                  <p>Max Locations: {settings.maxLocations || 'Unlimited'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Features</h4>
                <div className="space-y-1 text-sm">
                  <p>Returns: {features.returns ? '✅' : '❌'}</p>
                  <p>Inventory: {features.inventory ? '✅' : '❌'}</p>
                  <p>Reports: {features.reports ? '✅' : '❌'}</p>
                  <p>Multi-Location: {features.multiLocation ? '✅' : '❌'}</p>
                  <p>API Access: {features.apiAccess ? '✅' : '❌'}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Branding</h4>
                <div className="space-y-1 text-sm">
                  <p>Business Name: {branding.businessName || franchise.businessName || franchise.name}</p>
                  <p>Primary Color: 
                    <span 
                      className="inline-block w-4 h-4 rounded ml-2" 
                      style={{ backgroundColor: branding.primaryColor || '#3B82F6' }}
                    ></span>
                  </p>
                  <p>Tagline: {branding.tagline || 'None'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FranchiseDetailsModal;