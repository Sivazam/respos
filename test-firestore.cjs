// Test script to check Firestore connection and user creation
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC9f76SkbwC6Dgef8WS6bIS_h5gRL9137k",
  authDomain: "restpossys.firebaseapp.com",
  projectId: "restpossys",
  storageBucket: "restpossys.firebasestorage.app",
  messagingSenderId: "626111912551",
  appId: "1:626111912551:web:21b11b07192e09fd2fd2c2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestoreConnection() {
  try {
    console.log('Testing Firestore connection...');
    
    // Test 1: Check existing users
    console.log('\n=== Checking existing users ===');
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const usersSnapshot = await getDocs(usersQuery);
    
    console.log(`Found ${usersSnapshot.docs.length} users in Firestore:`);
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.email} (${data.role}, approved: ${data.isApproved}, active: ${data.isActive})`);
    });
    
    // Test 2: Try to create a test user
    console.log('\n=== Creating test user ===');
    const testUserData = {
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'admin',
      isActive: false,
      isApproved: false,
      franchiseId: 'test-franchise-id',
      locationId: null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };
    
    const userRef = await addDoc(collection(db, 'users'), testUserData);
    console.log(`✅ Test user created with ID: ${userRef.id}`);
    
    // Test 3: Verify the user was created
    console.log('\n=== Verifying test user ===');
    const updatedUsersSnapshot = await getDocs(usersQuery);
    console.log(`Now found ${updatedUsersSnapshot.docs.length} users in Firestore:`);
    updatedUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.email} (${data.role}, approved: ${data.isApproved}, active: ${data.isActive})`);
    });
    
    console.log('\n✅ Firestore connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
  }
}

testFirestoreConnection();