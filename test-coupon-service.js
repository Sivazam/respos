// Simple test script to debug coupon service issues
import { couponService } from './src/services/couponService.js';

console.log('Testing coupon service...');

// Test 1: Check if service is properly initialized
console.log('Coupon service initialized:', !!couponService);

// Test 2: Try to create a test coupon
const testCoupon = {
  name: 'TEST50',
  type: 'fixed',
  value: 50,
  maxDiscountAmount: undefined,
  minOrderAmount: 100,
  description: 'Test coupon for debugging',
  isActive: true,
  locationId: 'test-location-id',
  createdBy: 'test-user-id'
};

console.log('Test coupon data:', testCoupon);

// Test 3: Try to fetch coupons for a location
console.log('Testing coupon fetch...');
couponService.getLocationCoupons('test-location-id')
  .then(coupons => {
    console.log('Coupons fetched successfully:', coupons);
  })
  .catch(error => {
    console.error('Error fetching coupons:', error);
  });

// Test 4: Try to create a coupon
console.log('Testing coupon creation...');
couponService.createCoupon(testCoupon)
  .then(couponId => {
    console.log('Coupon created successfully with ID:', couponId);
  })
  .catch(error => {
    console.error('Error creating coupon:', error);
  });