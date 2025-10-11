// Simple script to fix franchise assignment
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs, doc, updateDoc } = require('firebase/firestore');

// Your Firebase config (same as in firebase/config.js)
const firebaseConfig = {
  apiKey: "AIzaSyBjK9XsA_7jxP5XzL8nM2zQ3rW4sT5uV6w",
  authDomain: "millet-home-foods-pos.firebaseapp.com",
  projectId: "millet-home-foods-pos",
  storageBucket: "millet-home-foods-pos.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixFranchiseAssignment() {
  try {
    console.log('Checking for existing franchises...');
    
    // Check if any franchise exists
    const franchiseQuery = query(collection(db, 'franchises'), orderBy('createdAt', 'desc'), limit(1));
    const franchiseSnapshot = await getDocs(franchiseQuery);
    
    let franchiseId;
    if (franchiseSnapshot.empty) {
      console.log('No franchise found, creating default franchise...');
      
      // Create a default franchise
      const franchiseData = {
        name: 'Default Franchise',
        email: 'admin@forkflow.com',
        phone: '+1234567890',
        address: 'Default Address',
        subscriptionPlan: 'basic',
        maxLocations: 10,
        isActive: true,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const franchiseRef = await addDoc(collection(db, 'franchises'), franchiseData);
      franchiseId = franchiseRef.id;
      console.log('Default franchise created with ID:', franchiseId);
    } else {
      franchiseId = franchiseSnapshot.docs[0].id;
      console.log('Found existing franchise with ID:', franchiseId);
    }
    
    // Update the location to have the franchiseId
    const locationId = 'QPbJmnxZfhOVYddrFeV5'; // Your location ID
    const locationRef = doc(db, 'locations', locationId);
    
    await updateDoc(locationRef, {
      franchiseId: franchiseId,
      updatedAt: new Date()
    });
    
    console.log('Location updated with franchiseId:', franchiseId);
    console.log('✅ Franchise assignment fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing franchise assignment:', error);
  }
}

// Add the missing import
const { addDoc } = require('firebase/firestore');

fixFranchiseAssignment();