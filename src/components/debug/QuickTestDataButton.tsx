import React, { useState } from 'react';
import { createAllTestData } from '../../utils/createTestData';

const QuickTestDataButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await createAllTestData();
      setMessage('✅ Test data created successfully! Refresh the page to see changes.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: unknown) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleCreateData}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Creating...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Test Data</span>
          </>
        )}
      </button>
      
      {message && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-3 min-w-max max-w-xs">
          <div className="text-sm">{message}</div>
        </div>
      )}
    </div>
  );
};

export default QuickTestDataButton;