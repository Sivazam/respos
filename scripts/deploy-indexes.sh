#!/bin/bash

# Firestore Index Deployment Script
# This script deploys the required Firestore indexes for the application

echo "🔥 Deploying Firestore indexes..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase login list &> /dev/null; then
    echo "🔐 Please login to Firebase:"
    firebase login
fi

# Deploy indexes
echo "📊 Deploying indexes from firestore.indexes.json..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Indexes deployed successfully!"
    echo "⏳ Note: It may take a few minutes for indexes to be created."
else
    echo "❌ Failed to deploy indexes."
    echo "💡 You can also deploy manually from the Firebase Console."
    echo "📖 See deploy-indexes.md for instructions."
fi