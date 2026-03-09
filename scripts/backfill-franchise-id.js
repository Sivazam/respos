import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Error: service-account.json not found in the root directory.');
    console.error('Please download your service account from Firebase Console > Project Settings > Service Accounts,');
    console.error('save it as "service-account.json" in the root directory, and try again.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Check for --execute flag
const isDryRun = !process.argv.includes('--execute');

async function backfillFranchiseId() {
    if (isDryRun) {
        console.log('--- DRY RUN MODE ---');
        console.log('No documents will be updated. Provide --execute flag to apply changes.');
        console.log('--------------------\n');
    } else {
        console.log('--- EXECUTE MODE ---');
        console.log('Documents WILL be updated.');
        console.log('--------------------\n');
    }

    console.log('Starting backfill for franchiseId...');

    // 1. Get all locations to map locationId -> franchiseId
    console.log('Fetching locations to map locationId to franchiseId...');
    const locationsSnapshot = await db.collection('locations').get();
    const locationToFranchiseMap = {};

    locationsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.franchiseId) {
            locationToFranchiseMap[doc.id] = data.franchiseId;
        }
    });

    console.log(`Found ${Object.keys(locationToFranchiseMap).length} locations with franchiseIds.`);
    console.log('Location Map:', locationToFranchiseMap);

    // 2. Collections to backfill
    const collectionsToBackfill = [
        'products',
        'categories',
        'menuItems',
        'tables',
        'orders',
        'purchases',
        'returns',
        'sales',
        'stockUpdates'
    ];

    let totalDocsToUpdate = 0;

    for (const collectionName of collectionsToBackfill) {
        console.log(`\nProcessing collection: ${collectionName}`);
        let updatedInCollection = 0;

        const snapshot = await db.collection(collectionName).get();
        console.log(`Found ${snapshot.size} total documents in ${collectionName}`);

        // We'll use batches to update documents efficiently
        let batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // If document already has a franchiseId, skip it
            if (data.franchiseId) continue;

            let targetFranchiseId = null;

            // Try to determine franchiseId from locationId
            if (data.locationId && locationToFranchiseMap[data.locationId]) {
                targetFranchiseId = locationToFranchiseMap[data.locationId];
            }

            if (targetFranchiseId) {
                if (!isDryRun) {
                    // Queue the update
                    batch.update(doc.ref, { franchiseId: targetFranchiseId });
                    batchCount++;

                    // Commit batch if we hit the 500 limit
                    if (batchCount === 500) {
                        await batch.commit();
                        batch = db.batch();
                        batchCount = 0;
                        console.log(`  Committed batch of 500 updates for ${collectionName}...`);
                    }
                }
                updatedInCollection++;
                totalDocsToUpdate++;
            }
        }

        if (!isDryRun && batchCount > 0) {
            // Commit any remaining updates in the batch
            await batch.commit();
            console.log(`  Committed final batch of ${batchCount} updates for ${collectionName}.`);
        }

        if (isDryRun) {
            console.log(`[DRY RUN] Would update ${updatedInCollection} documents in ${collectionName}.`);
        } else {
            console.log(`Updated ${updatedInCollection} documents in ${collectionName}.`);
        }
    }

    if (isDryRun) {
        console.log(`\n[DRY RUN] Complete! A total of ${totalDocsToUpdate} documents would be updated.`);
        console.log('Run this script with --execute to apply the changes.');
    } else {
        console.log(`\nBackfill complete! Total documents updated: ${totalDocsToUpdate}`);
    }
}

backfillFranchiseId().catch(console.error);
