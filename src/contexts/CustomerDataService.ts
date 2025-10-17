import { db } from '../firebase/config';
import { doc, setDoc, collection, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore';

export interface CustomerData {
  orderId: string;
  name?: string;
  phone?: string;
  city?: string;
  paymentMethod?: 'cash' | 'card' | 'upi';
  source: 'staff' | 'manager';
  timestamp: number;
  date: string; // Added date field in dd/mm/yyyy format
  userId?: string;
  branchId?: string;
  franchiseId?: string; // Added franchiseId for proper data isolation
}

export async function upsertCustomerData(
  orderId: string, 
  payload: {
    name?: string;
    phone?: string;
    city?: string;
    paymentMethod?: 'cash' | 'card' | 'upi';
  }, 
  source: 'staff' | 'manager' = 'staff', 
  timestamp: number = Date.now(),
  userId?: string,
  branchId?: string,
  franchiseId?: string
): Promise<CustomerData> {
  if (!orderId) throw new Error('orderId required');
  
  // Format date as dd/mm/yyyy
  const dateObj = new Date(timestamp);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  const docRef = doc(db, 'customer_data', orderId);
  const data: CustomerData = {
    orderId,
    name: payload.name || '',
    phone: payload.phone || '',
    city: payload.city || '',
    paymentMethod: payload.paymentMethod,
    source,
    timestamp,
    date: formattedDate,
    userId,
    branchId,
    franchiseId
  };
  
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function fetchCustomerData(startTs: number, endTs: number, franchiseId?: string): Promise<CustomerData[]> {
  console.log('🔍 fetchCustomerData called with:', {
    startTs,
    endTs,
    franchiseId,
    startDate: new Date(startTs).toLocaleString(),
    endDate: new Date(endTs).toLocaleString()
  });

  try {
    // First, query by timestamp range only (this doesn't require a composite index)
    console.log('📋 Querying by timestamp range only');
    const q = query(
      collection(db, 'customer_data'),
      where('timestamp', '>=', startTs),
      where('timestamp', '<=', endTs),
      orderBy('timestamp', 'desc')
    );

    const snap = await getDocs(q);
    let result = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerData & { id: string }));
    
    console.log(`✅ Firestore query returned ${result.length} documents`);
    
    // If franchiseId is provided, filter the results on the client side
    if (franchiseId) {
      console.log('📋 Applying client-side franchise filter');
      const filteredResult = result.filter(doc => doc.franchiseId === franchiseId);
      console.log(`📋 After franchise filtering: ${filteredResult.length} documents`);
      result = filteredResult;
    } else {
      console.warn('⚠️  fetchCustomerData called without franchiseId - this may expose data from multiple franchises');
    }
    
    // Debug: Log sample documents for verification
    if (result.length > 0) {
      console.log('📋 Sample documents from Firestore:', result.slice(0, 2).map(doc => ({
        id: doc.id,
        orderId: doc.orderId,
        name: doc.name,
        phone: doc.phone,
        city: doc.city,
        timestamp: doc.timestamp,
        franchiseId: doc.franchiseId,
        readableDate: new Date(doc.timestamp).toLocaleString()
      })));
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching customer data from Firestore:', error);
    throw error;
  }
}

export async function fetchCustomerDataByOrderId(orderId: string): Promise<CustomerData | null> {
  if (!orderId) return null;
  
  try {
    const docRef = doc(db, 'customer_data', orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CustomerData & { id: string };
    }
    return null;
  } catch (error) {
    console.error('Error fetching customer data by order ID:', error);
    return null;
  }
}