import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useFranchises } from '../../contexts/FranchiseContext';
import { Building2, Users, MapPin, BarChart3, Settings, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const FranchiseOwnerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentFranchise } = useFranchises();

  const stats = [
    {
      title: 'Total Locations',
      value: '3',
      change: '+1 this month',
      icon: MapPin,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Staff',
      value: '12',
      change: '+2 this month',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Monthly Revenue',
      value: '₹125,430',
      change: '+12% vs last month',
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Active Locations',
      value: '3',
      change: 'All operational',
      icon: Building2,
      color: 'bg-orange-500'
    }
  ];

  const quickActions = [
    {
      title: 'Manage Locations',
      description: 'Add, edit, or remove franchise locations',
      icon: MapPin,
      href: '/franchise/locations',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: 'Staff Management',
      description: 'Manage users across all locations',
      icon: Users,
      href: '/franchise/users',
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      title: 'Franchise Settings',
      description: 'Configure franchise-wide settings',
      icon: Settings,
      href: '/franchise/settings',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      title: 'Analytics',
      description: 'View performance across all locations',
      icon: BarChart3,
      href: '/franchise/analytics',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    }
  ];

  return (
    <DashboardLayout title="Franchise Dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Franchise Owner'}!
          </h1>
          <p className="text-blue-100 text-lg">
            {currentFranchise ? `Managing ${currentFranchise.name}` : 'Manage your franchise operations from this central dashboard'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
              <p className="text-sm text-green-600 font-medium">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${action.color}`}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <action.icon className="h-8 w-8 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">New location added</p>
                <p className="text-sm text-gray-600">Downtown Store #3 was successfully added to your franchise</p>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Staff member added</p>
                <p className="text-sm text-gray-600">Rahul Sharma was added as Manager at Location #2</p>
              </div>
              <span className="text-sm text-gray-500">5 hours ago</span>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Monthly report generated</p>
                <p className="text-sm text-gray-600">Performance report for April 2025 is now available</p>
              </div>
              <span className="text-sm text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FranchiseOwnerDashboard;