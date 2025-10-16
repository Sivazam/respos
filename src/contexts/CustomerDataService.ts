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
  branchId?: string
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
    branchId
  };
  
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function fetchCustomerData(startTs: number, endTs: number): Promise<CustomerData[]> {
  const q = query(
    collection(db, 'customer_data'),
    where('timestamp', '>=', startTs),
    where('timestamp', '<=', endTs),
    orderBy('timestamp', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerData & { id: string }));
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