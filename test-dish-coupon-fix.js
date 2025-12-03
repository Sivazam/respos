// Test script to verify dish coupon fixes with integer flooring
import { couponService } from './src/services/couponService.js';

// Test dish coupon calculation (should apply to only 1 quantity and floor the result)
const testOrderItems = [
  { name: 'Chilli Chicken', price: 169, quantity: 3 },  // 10% = 16.9 → 16
  { name: 'Chilli Chicken', price: 80, quantity: 1 }    // 10% = 8.0 → 8
];

const testDishCoupon = {
  id: 'test1',
  couponCode: 'CHILLICHICKEN10',
  dishName: 'Chilli Chicken',
  discountPercentage: 10,
  isActive: true,
  locationId: 'test',
  createdBy: 'test'
};

console.log('Testing dish coupon calculation with integer flooring:');
console.log('Order items:', testOrderItems);
console.log('Dish coupon:', testDishCoupon);

// This should calculate discount for only 1 quantity of each matching dish
// Expected: Math.floor(169 * 0.10) + Math.floor(80 * 0.10) = Math.floor(16.9) + Math.floor(8.0) = 16 + 8 = 24
const discount = couponService.calculateDishCouponDiscount(testDishCoupon, testOrderItems);
console.log('Calculated discount:', discount);
console.log('Expected discount: 24 (16 + 8, with flooring)');
console.log('Discount calculation is correct:', discount === 24);

// Test with example from user: 16.90 should become 16
const testOrderItems2 = [
  { name: 'Test Dish', price: 169, quantity: 1 }  // 10% = 16.9 → 16
];

const testDishCoupon2 = {
  id: 'test2',
  couponCode: 'TESTDISH10',
  dishName: 'Test Dish',
  discountPercentage: 10,
  isActive: true,
  locationId: 'test',
  createdBy: 'test'
};

const discount2 = couponService.calculateDishCouponDiscount(testDishCoupon2, testOrderItems2);
console.log('\nTesting user example:');
console.log('Price: 169, 10% = 16.9');
console.log('Floored result:', discount2);
console.log('Expected: 16, Actual:', discount2, 'Correct:', discount2 === 16);