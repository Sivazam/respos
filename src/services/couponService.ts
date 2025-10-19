import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/db';

export interface Coupon {
  id?: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  maxDiscountAmount?: number | null; // Only for percentage coupons
  minOrderAmount?: number | null;
  description?: string | null;
  isActive: boolean;
  locationId: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppliedCoupon {
  couponId: string;
  name: string;
  type: 'fixed' | 'percentage';
  discountAmount: number;
  appliedAt: Timestamp;
}

class CouponService {
  private collectionName = 'coupons';

  // Get all coupons for a location
  async getLocationCoupons(locationId: string): Promise<Coupon[]> {
    try {
      console.log('🔍 CouponService: Fetching coupons for location:', locationId);
      
      if (!locationId) {
        throw new Error('Location ID is required');
      }

      // Simple query without orderBy to avoid index requirement
      const q = query(
        collection(db, this.collectionName),
        where('locationId', '==', locationId)
      );
      
      console.log('🔍 CouponService: Executing simple query...');
      const querySnapshot = await getDocs(q);
      console.log('🔍 CouponService: Query executed, total docs found:', querySnapshot.docs.length);
      
      // Client-side filtering and sorting to avoid indexes
      const coupons = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Coupon))
        .filter(coupon => coupon.isActive) // Filter active coupons on client side
        .sort((a, b) => {
          // Sort by createdAt descending on client side
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA; // Descending order (newest first)
        });
      
      console.log('✅ CouponService: Active coupons processed:', coupons.length);
      return coupons;
    } catch (error) {
      console.error('❌ CouponService: Error fetching coupons:', error);
      console.error('❌ CouponService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  // Create a new coupon
  async createCoupon(couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('🔍 CouponService: Creating coupon with data:', couponData);
      
      if (!couponData.locationId) {
        throw new Error('Location ID is required');
      }
      
      if (!couponData.createdBy) {
        throw new Error('Created by user ID is required');
      }

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...couponData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      console.log('✅ CouponService: Coupon created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ CouponService: Error creating coupon:', error);
      console.error('❌ CouponService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  // Update an existing coupon
  async updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<void> {
    try {
      const couponRef = doc(db, this.collectionName, couponId);
      await updateDoc(couponRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  }

  // Delete/deactivate a coupon
  async deleteCoupon(couponId: string): Promise<void> {
    try {
      const couponRef = doc(db, this.collectionName, couponId);
      await updateDoc(couponRef, {
        isActive: false,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw error;
    }
  }

  // Calculate discount amount for a given coupon and order subtotal
  calculateCouponDiscount(coupon: Coupon, subtotal: number): number {
    if (subtotal <= 0) return 0;

    // Check minimum order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return 0;
    }

    let discount = 0;

    if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discount = subtotal * (coupon.value / 100);
      
      // Apply maximum discount limit if specified
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(discount, subtotal);
  }

  // Get coupon by ID
  async getCouponById(couponId: string): Promise<Coupon | null> {
    try {
      const couponRef = doc(db, this.collectionName, couponId);
      const couponSnap = await getDoc(couponRef);
      
      if (couponSnap.exists()) {
        return {
          id: couponSnap.id,
          ...couponSnap.data()
        } as Coupon;
      }
      return null;
    } catch (error) {
      console.error('Error fetching coupon:', error);
      throw error;
    }
  }
}

export const couponService = new CouponService();