// Temporary database reset script
// Run this with: node scripts/reset-database.js

const { cleanupDatabase, createSampleData } = require('../src/utils/databaseCleanup');

// Mock Firebase config for Node.js environment
const mockFirebase = {
  collection: (db, name) => ({ name }),
  query: (ref) => ref,
  getDocs: async (ref) => {
    // Mock empty snapshots for all collections
    return { docs: [], empty: true };
  },
  doc: (ref, id) => ({ id: id || 'mock-id' }),
  writeBatch: (db) => ({
    delete: (ref) => {},
    commit: async () => {}
  }),
  set: async (data) => {}
};

const mockDb = {};

// Override the firebase config temporarily
const originalConfig = require('../src/firebase/config');
// This is a temporary script - in production you'd need proper Firebase admin SDK

console.log('🚀 Starting database reset...');
console.log('⚠️  This script is for demonstration - actual reset needs to be done via the Super Admin Dashboard');
console.log('');
console.log('To reset the database:');
console.log('1. Log in as Super Admin');
console.log('2. Go to Super Admin Dashboard');
console.log('3. Click the "Reset Database" button');
console.log('4. Confirm the action when prompted');
console.log('');
console.log('This will:');
console.log('- Delete ALL existing data (locations, franchises, users, etc.)');
console.log('- Create 2 sample franchises:');
console.log('  - "Na Potta Na Istam" with store in ramachandrapuram');
console.log('  - "SHiv kitchen" with store in shivajinagar');
console.log('- Set up proper franchise-store relationships');
console.log('');
console.log('The old duplicate locations will be removed and replaced with the proper structure.');