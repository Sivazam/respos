import React, { useState } from 'react';
import { createAllTestData } from '../../utils/createTestData';

const TestDataCreator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCreateTestData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await createAllTestData();
      setMessage('Test data created successfully! Refresh the page to see the data.');
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50 test-data-creator">
      <h3 className="font-bold mb-2">Test Data Creator</h3>
      <p className="text-xs text-gray-600 mb-3">
        Create sample sales, menu items, and categories to test the dashboard.
      </p>
      
      <button
        onClick={handleCreateTestData}
        disabled={loading}
        className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create Test Data'}
      </button>
      
      {message && (
        <div className={`mt-2 p-2 rounded text-xs ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      <button 
        onClick={() => (document.querySelector('.test-data-creator') as HTMLElement)?.remove()}
        className="mt-2 w-full px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
      >
        Close
      </button>
    </div>
  );
};

export default TestDataCreator;