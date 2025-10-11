#!/usr/bin/env node

/**
 * Simple script to guide administrators through index setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'restpossys';
const INDEXES_FILE = path.join(__dirname, '../firestore.indexes.json');

console.log('🔥 Restaurant POS - Firestore Index Setup');
console.log('==========================================\n');

// Check if Firebase CLI is available
function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// Show current indexes
function showCurrentIndexes() {
  console.log('📋 Current indexes in firestore.indexes.json:');
  try {
    const indexes = JSON.parse(fs.readFileSync(INDEXES_FILE, 'utf8'));
    indexes.indexes.forEach((index, i) => {
      console.log(`${i + 1}. Collection: ${index.collectionGroup}`);
      console.log(`   Fields: ${index.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`);
    });
  } catch (error) {
    console.log('❌ Could not read indexes file');
  }
  console.log();
}

// Show manual setup instructions
function showManualInstructions() {
  console.log('🔧 Manual Index Setup Instructions:');
  console.log('===================================\n');
  
  console.log('Option 1: Use Firebase Console (Recommended)');
  console.log('-------------------------------------------');
  console.log('1. Go to: https://console.firebase.google.com/');
  console.log(`2. Select project: ${PROJECT_ID}`);
  console.log('3. Navigate to Firestore Database → Indexes');
  console.log('4. Click "Create Index" and add the following indexes:\n');
  
  showCurrentIndexes();
  
  console.log('Option 2: Use Firebase CLI');
  console.log('---------------------------');
  console.log('1. Install Firebase CLI: npm install -g firebase-tools');
  console.log('2. Login: firebase login');
  console.log('3. Deploy indexes: firebase deploy --only firestore:indexes\n');
  
  console.log('Option 3: Use the provided URL in error messages');
  console.log('------------------------------------------------');
  console.log('When you see the index error in the application,');
  console.log('click the provided URL to create the index automatically.\n');
}

// Main execution
function main() {
  const hasCLI = checkFirebaseCLI();
  
  if (hasCLI) {
    console.log('✅ Firebase CLI detected\n');
    
    try {
      console.log('🚀 Attempting to deploy indexes...');
      execSync('firebase deploy --only firestore:indexes', { stdio: 'inherit' });
      console.log('\n✅ Indexes deployed successfully!');
    } catch (error) {
      console.log('\n❌ Automatic deployment failed.');
      console.log('Please follow the manual instructions below:\n');
      showManualInstructions();
    }
  } else {
    console.log('⚠️  Firebase CLI not found\n');
    showManualInstructions();
  }
  
  console.log('📖 For more information, see: deploy-indexes.md');
}

if (require.main === module) {
  main();
}

module.exports = { showManualInstructions, showCurrentIndexes };