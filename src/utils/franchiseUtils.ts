import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Franchise } from '../types';

/**
 * Get franchise data by location ID
 * This function fetches the location first, then gets the associated franchise
 */
export const getFranchiseByLocationId = async (locationId: string): Promise<Franchise | null> => {
  try {
    if (!locationId) {
      console.warn('No locationId provided to getFranchiseByLocationId');
      return null;
    }

    // First get the location to find the franchiseId
    const locationDoc = await getDoc(doc(db, 'locations', locationId));
    
    if (!locationDoc.exists()) {
      console.warn('Location not found:', locationId);
      return null;
    }

    const locationData = locationDoc.data();
    const franchiseId = locationData.franchiseId;

    if (!franchiseId) {
      console.warn('Location has no franchiseId:', locationId);
      return null;
    }

    // Now get the franchise data
    const franchiseDoc = await getDoc(doc(db, 'franchises', franchiseId));
    
    if (!franchiseDoc.exists()) {
      console.warn('Franchise not found:', franchiseId);
      return null;
    }

    const franchiseData = franchiseDoc.data();
    
    return {
      id: franchiseDoc.id,
      ...franchiseData,
      createdAt: franchiseData.createdAt?.toDate(),
      updatedAt: franchiseData.updatedAt?.toDate(),
      approvedAt: franchiseData.approvedAt?.toDate()
    } as Franchise;

  } catch (error) {
    console.error('Error fetching franchise by location ID:', error);
    return null;
  }
};

/**
 * Get franchise data by franchise ID
 */
export const getFranchiseById = async (franchiseId: string): Promise<Franchise | null> => {
  try {
    if (!franchiseId) {
      console.warn('No franchiseId provided to getFranchiseById');
      return null;
    }

    const franchiseDoc = await getDoc(doc(db, 'franchises', franchiseId));
    
    if (!franchiseDoc.exists()) {
      console.warn('Franchise not found:', franchiseId);
      return null;
    }

    const franchiseData = franchiseDoc.data();
    
    return {
      id: franchiseDoc.id,
      ...franchiseData,
      createdAt: franchiseData.createdAt?.toDate(),
      updatedAt: franchiseData.updatedAt?.toDate(),
      approvedAt: franchiseData.approvedAt?.toDate()
    } as Franchise;

  } catch (error) {
    console.error('Error fetching franchise by ID:', error);
    return null;
  }
};

/**
 * Get formatted franchise data for receipts
 * Returns default values if franchise data is not available
 */
export const getFranchiseReceiptData = async (locationId: string): Promise<{
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  gstNumber: string | null;
}> => {
  const franchise = await getFranchiseByLocationId(locationId);
  
  if (franchise) {
    return {
      name: franchise.name || 'Restaurant',
      address: franchise.address || 'Restaurant Address',
      phone: franchise.phone || 'Contact Number',
      email: franchise.email || '',
      logoUrl: franchise.logoUrl || null,
      gstNumber: franchise.gstNumber || null
    };
  }
  
  // Default fallback values
  return {
    name: 'FORKFLOW POS',
    address: 'Restaurant Address',
    phone: 'Contact Number',
    email: '',
    logoUrl: null,
    gstNumber: null
  };
};