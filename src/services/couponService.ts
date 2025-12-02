import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/db';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit,
  documentId
} from 'firebase/firestore';

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

// Dish-specific coupon interfaces
export interface DishCoupon {
  id?: string;
  couponCode: string;        // e.g., "CHILLICHICKEN8"
  dishName: string;          // e.g., "Chilli Chicken"
  discountPercentage: number; // e.g., 8
  isActive: boolean;
  locationId: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppliedDishCoupon {
  couponId: string;
  couponCode: string;
  dishName: string;
  discountPercentage: number;
  discountAmount: number;
  appliedAt: Timestamp;
}

// Standalone helper function for generating coupon codes
export const generateCouponCode = (dishName: string, percentage: number): string => {
  const baseName = dishName.trim().replace(/\s+/g, '').toUpperCase();
  return `${baseName}${percentage}`;
};

class CouponService {
  private collectionName = 'coupons';
  private dishCouponCollectionName = 'dishCoupons';

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

  // ==================== DISH-SPECIFIC COUPON METHODS ====================

  // Get all dish coupons for a location
  async getLocationDishCoupons(locationId: string): Promise<DishCoupon[]> {
    try {
      console.log('🔍 CouponService: Fetching dish coupons for location:', locationId);
      
      if (!locationId) {
        throw new Error('Location ID is required');
      }

      const q = query(
        collection(db, this.dishCouponCollectionName),
        where('locationId', '==', locationId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('🔍 CouponService: Dish coupons query executed, total docs found:', querySnapshot.docs.length);
      
      const dishCoupons = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as DishCoupon))
        .filter(coupon => coupon.isActive)
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
      
      console.log('✅ CouponService: Active dish coupons processed:', dishCoupons.length);
      return dishCoupons;
    } catch (error) {
      console.error('❌ CouponService: Error fetching dish coupons:', error);
      throw error;
    }
  }

  // Create new dish coupons (bulk creation)
  async createDishCoupons(dishName: string, percentages: number[], locationId: string, createdBy: string): Promise<string[]> {
    try {
      console.log('🔍 CouponService: Creating dish coupons for dish:', dishName, 'percentages:', percentages);
      
      if (!dishName.trim()) {
        throw new Error('Dish name is required');
      }
      
      if (!locationId) {
        throw new Error('Location ID is required');
      }
      
      if (!createdBy) {
        throw new Error('Created by user ID is required');
      }

      const couponIds: string[] = [];
      const baseDishName = dishName.trim().replace(/\s+/g, '').toUpperCase();
      
      for (const percentage of percentages) {
        if (percentage <= 0 || percentage > 100) {
          console.warn(`⚠️ Skipping invalid percentage: ${percentage}`);
          continue;
        }

        const couponCode = `${baseDishName}${percentage}`;
        
        const couponData: Omit<DishCoupon, 'id' | 'createdAt' | 'updatedAt'> = {
          couponCode,
          dishName: dishName.trim(),
          discountPercentage: percentage,
          isActive: true,
          locationId,
          createdBy
        };

        const docRef = await addDoc(collection(db, this.dishCouponCollectionName), {
          ...couponData,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        couponIds.push(docRef.id);
        console.log(`✅ Dish coupon created: ${couponCode} with ID: ${docRef.id}`);
      }
      
      console.log('✅ CouponService: All dish coupons created successfully');
      return couponIds;
    } catch (error) {
      console.error('❌ CouponService: Error creating dish coupons:', error);
      throw error;
    }
  }

  // Get dish coupon by ID
  async getDishCouponById(couponId: string): Promise<DishCoupon | null> {
    try {
      const couponRef = doc(db, this.dishCouponCollectionName, couponId);
      const couponSnap = await getDoc(couponRef);
      
      if (couponSnap.exists()) {
        return {
          id: couponSnap.id,
          ...couponSnap.data()
        } as DishCoupon;
      }
      return null;
    } catch (error) {
      console.error('Error fetching dish coupon:', error);
      throw error;
    }
  }

  // Search dish coupons by dish name or coupon code
  async searchDishCoupons(locationId: string, searchTerm: string): Promise<DishCoupon[]> {
    try {
      console.log('🔍 CouponService: Searching dish coupons with term:', searchTerm);
      
      const allCoupons = await this.getLocationDishCoupons(locationId);
      const searchLower = searchTerm.toLowerCase();
      
      const filteredCoupons = allCoupons.filter(coupon => 
        coupon.dishName.toLowerCase().includes(searchLower) ||
        coupon.couponCode.toLowerCase().includes(searchLower)
      );
      
      console.log('✅ CouponService: Found', filteredCoupons.length, 'matching dish coupons');
      return filteredCoupons;
    } catch (error) {
      console.error('❌ CouponService: Error searching dish coupons:', error);
      throw error;
    }
  }

  // Update dish coupon
  async updateDishCoupon(couponId: string, updates: Partial<DishCoupon>): Promise<void> {
    try {
      const couponRef = doc(db, this.dishCouponCollectionName, couponId);
      await updateDoc(couponRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating dish coupon:', error);
      throw error;
    }
  }

  // Delete/deactivate dish coupon
  async deleteDishCoupon(couponId: string): Promise<void> {
    try {
      // First, get the current coupon to verify it exists
      const couponRef = doc(db, this.dishCouponCollectionName, couponId);
      const couponSnap = await getDoc(couponRef);
      
      if (!couponSnap.exists()) {
        throw new Error('Dish coupon not found');
      }
      
      // Then delete the document
      await deleteDoc(couponRef);
      console.log(`✅ Dish coupon deleted successfully: ${couponId}`);
    } catch (error) {
      console.error('Error deleting dish coupon:', error);
      throw error;
    }
  }

  // Check if dish coupon is applicable to order
  isDishCouponApplicable(dishCoupon: DishCoupon, orderItems: any[]): { applicable: boolean; matchingItems: any[] } {
    const matchingItems = orderItems.filter(item => 
      item.name.toLowerCase() === dishCoupon.dishName.toLowerCase()
    );
    
    return {
      applicable: matchingItems.length > 0,
      matchingItems
    };
  }

  // Calculate dish-specific discount
  calculateDishCouponDiscount(dishCoupon: DishCoupon, orderItems: any[]): number {
    const { applicable, matchingItems } = this.isDishCouponApplicable(dishCoupon, orderItems);
    
    if (!applicable) {
      return 0;
    }
    
    const totalDiscount = matchingItems.reduce((total, item) => {
      const itemDiscount = (item.price || 0) * (dishCoupon.discountPercentage / 100) * (item.quantity || 1);
      return total + itemDiscount;
    }, 0);
    
    return totalDiscount;
  }

  // Generate coupon code from dish name and percentage
  // Note: This is now a standalone function exported above
}

export const couponService = new CouponService();