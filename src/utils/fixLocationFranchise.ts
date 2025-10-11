// Utility to fix existing locations without franchiseId
import { collection, query, orderBy, limit, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const fixLocationFranchiseIds = async () => {
  try {
    console.log('Starting location franchise ID fix...');
    
    // Check if any franchise exists
    const franchiseQuery = query(collection(db, 'franchises'), orderBy('createdAt', 'desc'), limit(1));
    const franchiseSnapshot = await getDocs(franchiseQuery);
    
    let franchiseId;
    if (franchiseSnapshot.empty) {
      console.log('No franchise found, creating default franchise...');
      
      // Create a default franchise
      const defaultFranchiseData = {
        name: 'Default Franchise',
        email: 'admin@forkflow.com',
        phone: '+1234567890',
        address: 'Default Address',
        subscriptionPlan: 'basic',
        maxLocations: 10,
        isActive: true,
        isApproved: true,
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const franchiseRef = await addDoc(collection(db, 'franchises'), defaultFranchiseData);
      franchiseId = franchiseRef.id;
      console.log('Default franchise created with ID:', franchiseId);
    } else {
      franchiseId = franchiseSnapshot.docs[0].id;
      console.log('Found existing franchise with ID:', franchiseId);
    }
    
    // Get all locations without franchiseId
    const locationsQuery = query(collection(db, 'locations'));
    const locationsSnapshot = await getDocs(locationsQuery);
    
    let updatedCount = 0;
    
    for (const locationDoc of locationsSnapshot.docs) {
      const locationData = locationDoc.data();
      
      if (!locationData.franchiseId) {
        console.log(`Updating location "${locationData.name}" with franchiseId...`);
        
        await updateDoc(doc(db, 'locations', locationDoc.id), {
          franchiseId: franchiseId,
          updatedAt: serverTimestamp()
        });
        
        updatedCount++;
      }
    }
    
    console.log(`✅ Fixed ${updatedCount} locations with missing franchiseId`);
    return updatedCount;
    
  } catch (error) {
    console.error('Error fixing location franchise IDs:', error);
    throw error;
  }
};

// Auto-run function for immediate fix
export const runFixIfAdmin = async () => {
  // This function can be called from the super admin dashboard
  // to fix existing locations
  try {
    const result = await fixLocationFranchiseIds();
    return result;
  } catch (error) {
    console.error('Failed to run fix:', error);
    return 0;
  }
};