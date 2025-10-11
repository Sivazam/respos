import React, { useState } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useAuth } from '../../contexts/AuthContext';
import { RestaurantFormData } from '../../types';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const RestaurantRegistrationPage: React.FC = () => {
  const { addRestaurant } = useRestaurant();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    businessName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addRestaurant(formData, currentUser.uid);
      setSuccess(true);
      setFormData({
        name: '',
        businessName: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to register restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Restaurant Registered!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your restaurant has been registered and is pending approval from the super admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Register Your Restaurant
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join our platform and start managing your restaurant efficiently
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Restaurant Name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter restaurant name"
            />
            
            <Input
              label="Business Name (Optional)"
              name="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter business name"
            />
            
            <Input
              label="Address"
              name="address"
              type="text"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter complete address"
            />
            
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
            
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
            />
            
            <Input
              label="GST Number (Optional)"
              name="gstNumber"
              type="text"
              value={formData.gstNumber}
              onChange={handleChange}
              placeholder="Enter GST number"
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Registering...' : 'Register Restaurant'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestaurantRegistrationPage;