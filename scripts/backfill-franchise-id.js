// Backfill franchiseId/locationId on legacy docs so the new Firestore rules
// don't lock out existing users.
//
// Usage:
//   node scripts/backfill-franchise-id.js              (dry-run)
//   node scripts/backfill-franchise-id.js --execute    (apply changes)
//
// Requires `restpossys-servicejson.json` (Firebase Admin service account) at repo root.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, '../restpossys-servicejson.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: ${path.basename(serviceAccountPath)} not found in the root directory.`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const isDryRun = !process.argv.includes('--execute');
const log = (msg) => console.log(msg);

async function commitInBatches(updates) {
  let batch = db.batch();
  let count = 0;
  for (const u of updates) {
    batch.update(u.ref, u.data);
    count++;
    if (count === 500) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

async function backfillDataCollections(locationToFranchiseMap) {
  const collections = [
    'products', 'categories', 'menuItems', 'tables',
    'orders', 'temporary_orders', 'manager_pending_orders', 'order_history',
    'purchases', 'returns', 'sales', 'stockUpdates', 'inventory',
    'customer_data', 'locationSettings',
  ];
  const results = {};
  for (const name of collections) {
    let snap;
    try {
      snap = await db.collection(name).get();
    } catch (e) {
      results[name] = { total: 0, toUpdate: 0, stillMissing: 0, error: e.message };
      continue;
    }
    const updates = [];
    let missing = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const patch = {};
      if (!data.franchiseId && data.locationId && locationToFranchiseMap[data.locationId]) {
        patch.franchiseId = locationToFranchiseMap[data.locationId];
      }
      if (name === 'locationSettings') {
        if (!data.locationId) patch.locationId = doc.id;
        if (!data.franchiseId && locationToFranchiseMap[doc.id]) {
          patch.franchiseId = locationToFranchiseMap[doc.id];
        }
      }
      if (Object.keys(patch).length > 0) updates.push({ ref: doc.ref, data: patch });
      else if (!data.franchiseId) missing++;
    }
    results[name] = { total: snap.size, toUpdate: updates.length, stillMissing: missing };
    if (!isDryRun && updates.length > 0) await commitInBatches(updates);
  }
  return results;
}

async function backfillUsers(locationToFranchiseMap, allFranchiseIds) {
  const usersSnap = await db.collection('users').get();
  const updates = [];
  let alreadyFine = 0;
  let stillBroken = 0;

  // Build uid -> set(locationIds) from existing orders/sales (sample 5000 each)
  const userToLocations = {};
  for (const cname of ['orders', 'sales', 'temporary_orders']) {
    try {
      const snap = await db.collection(cname).limit(5000).get();
      snap.forEach(d => {
        const data = d.data();
        const uid = data.staffId || data.createdBy || data.userId;
        if (uid && data.locationId) {
          if (!userToLocations[uid]) userToLocations[uid] = new Set();
          userToLocations[uid].add(data.locationId);
        }
      });
    } catch (e) { /* ignore */ }
  }

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const patch = {};
    const role = (data.role || '').toLowerCase();

    const currentLocationIds = Array.isArray(data.locationIds) ? data.locationIds.slice() : [];
    if (data.locationId && !currentLocationIds.includes(data.locationId)) {
      currentLocationIds.push(data.locationId);
    }
    if (currentLocationIds.length === 0 && userToLocations[userDoc.id]) {
      for (const lid of userToLocations[userDoc.id]) currentLocationIds.push(lid);
    }

    let franchiseId = data.franchiseId;
    if (!franchiseId) {
      for (const lid of currentLocationIds) {
        if (locationToFranchiseMap[lid]) { franchiseId = locationToFranchiseMap[lid]; break; }
      }
      if (!franchiseId && allFranchiseIds.length === 1) franchiseId = allFranchiseIds[0];
    }

    if (!data.franchiseId && franchiseId) patch.franchiseId = franchiseId;
    if (!Array.isArray(data.locationIds) && currentLocationIds.length > 0) {
      patch.locationIds = currentLocationIds;
    }

    const roleNeedsLocation = role === 'manager' || role === 'staff';
    if (Object.keys(patch).length > 0) updates.push({ ref: userDoc.ref, data: patch });
    else if (role === 'superadmin') alreadyFine++;
    else if (!data.franchiseId && !franchiseId) stillBroken++;
    else if (roleNeedsLocation && currentLocationIds.length === 0) stillBroken++;
    else alreadyFine++;
  }

  if (!isDryRun && updates.length > 0) await commitInBatches(updates);
  return { total: usersSnap.size, toUpdate: updates.length, alreadyFine, stillBroken };
}

async function reportBrokenUsers(locationToFranchiseMap, allFranchiseIds) {
  const usersSnap = await db.collection('users').get();
  const broken = [];
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const role = (data.role || '').toLowerCase();
    if (role === 'superadmin') continue;
    const locs = Array.isArray(data.locationIds) ? data.locationIds : (data.locationId ? [data.locationId] : []);
    let hasFranchise = !!data.franchiseId;
    if (!hasFranchise) {
      for (const lid of locs) if (locationToFranchiseMap[lid]) { hasFranchise = true; break; }
      if (!hasFranchise && allFranchiseIds.length === 1) hasFranchise = true;
    }
    if (!hasFranchise || ((role === 'manager' || role === 'staff') && locs.length === 0)) {
      broken.push({ uid: userDoc.id, email: data.email, role, hasFranchise, locsCount: locs.length });
    }
  }
  return broken;
}

async function main() {
  log(isDryRun ? '--- DRY RUN MODE (no writes) ---\n' : '--- EXECUTE MODE (writing) ---\n');

  log('Fetching locations + franchises...');
  const locationsSnap = await db.collection('locations').get();
  const locationToFranchiseMap = {};
  locationsSnap.forEach(d => {
    const data = d.data();
    if (data.franchiseId) locationToFranchiseMap[d.id] = data.franchiseId;
  });
  const franchisesSnap = await db.collection('franchises').get();
  const allFranchiseIds = franchisesSnap.docs.map(d => d.id);
  log(`  Locations with franchiseId: ${Object.keys(locationToFranchiseMap).length} / ${locationsSnap.size}`);
  log(`  Total franchises: ${allFranchiseIds.length}`);

  log('\n=== Data collections ===');
  const dataResults = await backfillDataCollections(locationToFranchiseMap);
  for (const [name, r] of Object.entries(dataResults)) {
    if (r.error) log(`  ${name.padEnd(25)} ERROR: ${r.error}`);
    else log(`  ${name.padEnd(25)} total=${String(r.total).padStart(5)}  toUpdate=${String(r.toUpdate).padStart(5)}  stillMissing=${r.stillMissing}`);
  }

  log('\n=== Users ===');
  const userResults = await backfillUsers(locationToFranchiseMap, allFranchiseIds);
  log(`  total=${userResults.total}  toUpdate=${userResults.toUpdate}  alreadyFine=${userResults.alreadyFine}  stillBroken=${userResults.stillBroken}`);

  if (userResults.stillBroken > 0) {
    log('\n=== Users that will be locked out by new rules (manual fix required) ===');
    const broken = await reportBrokenUsers(locationToFranchiseMap, allFranchiseIds);
    broken.forEach(b => log(`  - ${b.uid}  email=${b.email || 'n/a'}  role=${b.role}  hasFranchise=${b.hasFranchise}  locs=${b.locsCount}`));
  }

  log('\n' + (isDryRun
    ? 'Dry-run complete. Re-run with --execute to apply.'
    : 'Backfill complete.'));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
