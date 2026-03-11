// Database cleanup utility to reset and restructure
import { collection, query, getDocs, deleteDoc, doc, writeBatch, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const cleanupDatabase = async () => {
  try {
    console.log('🧹 Starting database cleanup...');

    // Collections to clean
    const collectionsToClean = [
      'locations',
      'franchises',
      'users',
      'categories',
      'products',
      'sales',
      'orders',
      'purchases',
      'returns',
      'stock',
      'tables'
    ];

    let totalDeleted = 0;

    for (const collectionName of collectionsToClean) {
      console.log(`🗑️ Cleaning collection: ${collectionName}`);

      const q = query(collection(db, collectionName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log(`✅ ${collectionName} is already empty`);
        continue;
      }

      // Delete in batches of 500 (Firestore limit)
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const document of querySnapshot.docs) {
        batch.delete(document.ref);
        batchCount++;
        totalDeleted++;

        if (batchCount === 500) {
          await batch.commit();
          console.log(`📦 Deleted batch of 500 from ${collectionName}`);
          batchCount = 0;
        }
      }

      // Delete remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`📦 Deleted final batch of ${batchCount} from ${collectionName}`);
      }

      console.log(`✅ Cleaned ${collectionName}: ${querySnapshot.docs.length} documents deleted`);
    }

    console.log(`🎉 Database cleanup completed! Total documents deleted: ${totalDeleted}`);
    return totalDeleted;

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

export const createSampleData = async () => {
  try {
    console.log('🏗️ Creating sample franchise structure...');

    // Create Franchise 1: "Sample Franchise A"
    const franchise1Ref = doc(collection(db, 'franchises'));
    const franchise1Data = {
      name: 'Sample Franchise A',
      email: 'admin@napotta.com',
      phone: '+1234567890',
      address: 'ramachandrapuram, India',
      subscriptionPlan: 'basic',
      maxLocations: 10,
      isActive: true,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(franchise1Ref, franchise1Data);

    // Create Store 1 for Franchise 1
    const store1Ref = doc(collection(db, 'locations'));
    const store1Data = {
      franchiseId: franchise1Ref.id,
      name: 'ramachandrapuram',
      storeName: 'Sample Franchise A - Main Store',
      address: 'ramachandrapuram',
      city: 'ramachandrapuram',
      state: 'Andhra Pradesh',
      zipCode: '533255',
      phone: '+1234567890',
      email: 'admin@napotta.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(store1Ref, store1Data);

    const product1Ref = doc(collection(db, 'products'));
    const product1Data = {
      franchiseId: franchise1Ref.id,
      locationId: store1Ref.id,
      name: 'Sample Product',
      price: 100,
      category: 'General',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(product1Ref, product1Data);

    const category1Ref = doc(collection(db, 'categories'));
    const category1Data = {
      franchiseId: franchise1Ref.id,
      locationId: store1Ref.id,
      name: 'General',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(category1Ref, category1Data);

    // Create Franchise 2: "Sample Franchise B"
    const franchise2Ref = doc(collection(db, 'franchises'));
    const franchise2Data = {
      name: 'Sample Franchise B',
      email: 'admin@sample-b.com',
      phone: '+1234567891',
      address: 'shivajinagar, India',
      subscriptionPlan: 'basic',
      maxLocations: 10,
      isActive: true,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(franchise2Ref, franchise2Data);

    // Create Store 1 for Franchise 2
    const store2Ref = doc(collection(db, 'locations'));
    const store2Data = {
      franchiseId: franchise2Ref.id,
      name: 'shivajinagar',
      storeName: 'Sample Franchise B - Main Store',
      address: 'jn road',
      city: 'shivajinagar',
      state: 'Karnataka',
      zipCode: '560001',
      phone: '7878787878',
      email: 'r@m.com',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(store2Ref, store2Data);

    console.log('✅ Sample franchise structure created successfully!');
    console.log(`📋 Franchise 1: ${franchise1Data.name} (ID: ${franchise1Ref.id})`);
    console.log(`🏪 Store 1: ${store1Data.storeName} (ID: ${store1Ref.id})`);
    console.log(`📋 Franchise 2: ${franchise2Data.name} (ID: ${franchise2Ref.id})`);
    console.log(`🏪 Store 2: ${store2Data.storeName} (ID: ${store2Ref.id})`);

    return {
      franchises: [
        { id: franchise1Ref.id, ...franchise1Data },
        { id: franchise2Ref.id, ...franchise2Data }
      ],
      stores: [
        { id: store1Ref.id, ...store1Data },
        { id: store2Ref.id, ...store2Data }
      ]
    };

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};