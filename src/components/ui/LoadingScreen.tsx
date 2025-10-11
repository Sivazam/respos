import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        <h2 className="text-xl font-semibold mt-4 text-gray-700 animate-pulse">Loading...</h2>
      </div>
    </div>
  );
};

export default LoadingScreen;