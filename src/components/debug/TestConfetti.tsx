'use client';

import { useState } from 'react';

const TestConfetti: React.FC = () => {
  const [showTest, setShowTest] = useState(false);

  if (showTest) {
    return (
      <div className="fixed inset-0 pointer-events-none z-[9998]">
        {/* Bright background overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-blue-500/30 animate-pulse" />
        
        {/* Test message */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black text-white p-8 rounded-lg text-2xl font-bold">
            🎉 TEST CONFETTI WORKING! 🎉
          </div>
        </div>
        
        {/* Test particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-yellow-400 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: '2s'
            }}
          />
        ))}
        
        {/* Close button */}
        <button
          onClick={() => setShowTest(false)}
          className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded"
        >
          Close Test
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-32 right-4 z-[10000]">
      <button
        onClick={() => setShowTest(true)}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
      >
        Test Simple Confetti
      </button>
    </div>
  );
};

export default TestConfetti;