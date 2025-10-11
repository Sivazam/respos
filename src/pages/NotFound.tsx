import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="text-4xl sm:text-6xl font-bold text-gray-800 mb-2">404</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
          Page not found
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-8 px-4">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary" className="inline-flex items-center">
            <Home size={18} className="mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;