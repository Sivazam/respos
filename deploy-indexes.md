# Firestore Index Deployment

This application requires Firestore indexes to work efficiently. The indexes are defined in `firestore.indexes.json`.

## Current Issue

The application is currently experiencing a Firestore index error:
```
FirebaseError: The query requires an index. You can create it here: 
https://console.firebase.google.com/v1/r/project/restpossys/firestore/indexes?create_composite=...
```

## Quick Fix Options

### Option 1: Click the Error Link (Fastest)
1. Copy the URL from the error message in the browser console
2. Paste it into your browser and press Enter
3. Click "Create Index" in the Firebase Console
4. Wait for the index to be created (usually takes a few minutes)

### Option 2: Use the Setup Script
```bash
node scripts/setup-indexes.js
```

### Option 3: Manual Setup in Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: `restpossys`
3. Navigate to Firestore Database → Indexes
4. Create these indexes:

## Required Indexes

The following indexes are required for optimal performance:

1. **Tables by Location and Date**
   - Collection: `tables`
   - Fields: `locationId` (ASCENDING), `createdAt` (DESCENDING)

2. **Tables by Location and Name**
   - Collection: `tables`
   - Fields: `locationId` (ASCENDING), `name` (ASCENDING)

3. **Tables by Location and Status**
   - Collection: `tables`
   - Fields: `locationId` (ASCENDING), `status` (ASCENDING)

4. **Sales by Location and Date**
   - Collection: `sales`
   - Fields: `locationId` (ASCENDING), `createdAt` (DESCENDING)

5. **Sales by Date**
   - Collection: `sales`
   - Fields: `createdAt` (DESCENDING)

6. **Inventory by Location and Name**
   - Collection: `inventory`
   - Fields: `locationId` (ASCENDING), `name` (ASCENDING)

7. **Inventory by Location and Category**
   - Collection: `inventory`
   - Fields: `locationId` (ASCENDING), `category` (ASCENDING)

8. **Returns by Sale and Date**
   - Collection: `returns`
   - Fields: `saleId` (ASCENDING), `createdAt` (DESCENDING)

9. **Returns by Location and Date**
   - Collection: `returns`
   - Fields: `locationId` (ASCENDING), `createdAt` (DESCENDING)

## Deployment Methods

### Method 1: Firebase CLI (Recommended)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Method 2: Firebase Console

1. Go to Firebase Console
2. Select your project (`restpossys`)
3. Navigate to Firestore Database
4. Click on "Indexes" tab
5. Create each index manually with the specifications above

## Current Status

The application has been updated with a **fallback mechanism** that allows it to continue working even without the indexes:

- ✅ Tables are fetched using simple queries (locationId only)
- ✅ Sorting is done client-side for better user experience
- ✅ Clear error messages guide administrators to create indexes
- ⚠️ Performance may be slower with large datasets

## Error Handling

If you see errors like "The query requires an index":

1. **Short-term**: The app continues working with client-side sorting
2. **Long-term**: Create the indexes using one of the methods above
3. **Monitoring**: Check browser console for specific index URLs

This gives you time to deploy the indexes without breaking the application.

## Verification

After deploying indexes, you should see:
- Faster query performance
- No more index error messages
- Server-side sorting for better scalability

To verify indexes are created:
1. Go to Firebase Console → Firestore → Indexes
2. Check that all required indexes show "Enabled" status