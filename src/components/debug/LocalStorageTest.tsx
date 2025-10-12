import React from 'react';
import { orderService } from '../services/orderService';

const LocalStorageTest: React.FC = () => {
  const testLocalStorage = () => {
    console.log('🧪 Testing localStorage...');
    
    // Test 1: Basic localStorage functionality
    try {
      const testKey = 'test_key_' + Date.now();
      const testValue = { test: 'data', timestamp: new Date() };
      
      localStorage.setItem(testKey, JSON.stringify(testValue));
      console.log('✅ Test 1: Basic write successful');
      
      const retrieved = localStorage.getItem(testKey);
      const parsed = JSON.parse(retrieved || '{}');
      console.log('✅ Test 1: Basic read successful:', parsed);
      
      localStorage.removeItem(testKey);
      console.log('✅ Test 1: Cleanup successful');
    } catch (error) {
      console.error('❌ Test 1 failed:', error);
    }
    
    // Test 2: Test orderService localStorage functionality
    try {
      console.log('✅ Test 2: orderService localStorage test skipped - no longer using localStorage');
    } catch (error) {
      console.error('❌ Test 2 failed:', error);
    }
    
    // Test 3: Simulate order transfer
    try {
      const testOrder = {
        id: 'test_order_' + Date.now(),
        orderId: 'test_order_' + Date.now(),
        orderNumber: 'TEST-001',
        locationId: 'test_location',
        franchiseId: 'test_franchise',
        transferredBy: 'test_staff',
        transferredAt: new Date(),
        priority: 'normal',
        status: 'pending',
        transferNotes: 'Test transfer',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [{ name: 'Test Item', quantity: 1, price: 10 }],
        totalAmount: 10,
        customerName: 'Test Customer',
        tableIds: ['table1']
      };
      
      const localStorageKey = `manager_pending_${testOrder.id}`;
      localStorage.setItem(localStorageKey, JSON.stringify(testOrder));
      console.log('✅ Test 3: Simulated order transfer stored:', localStorageKey);
      
      // Verify it can be retrieved
      const retrieved = localStorage.getItem(localStorageKey);
      if (retrieved) {
        const parsed = JSON.parse(retrieved);
        console.log('✅ Test 3: Simulated order retrieved:', parsed);
      } else {
        console.error('❌ Test 3: Failed to retrieve simulated order');
      }
      
      // Test the getLocalStorageOrders function
      console.log('🔍 Current localStorage keys:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`  ${i}: ${key}`);
      }
      
    } catch (error) {
      console.error('❌ Test 3 failed:', error);
    }
  };

  const simulateTransfer = async () => {
    console.log('🎯 Simulating order transfer...');
    
    try {
      // Create a test order that mimics the structure of a real order
      const testOrderId = 'sim_order_' + Date.now();
      const testStaffId = 'test_staff_123';
      
      // Simulate the transferOrderToManager function's localStorage storage
      const localStorageOrder = {
        id: testOrderId,
        orderId: testOrderId,
        locationId: 'bt0TAq5aXTC9n7GoWaY2', // Use the actual location ID from logs
        franchiseId: 'test_franchise',
        transferredBy: testStaffId,
        transferredAt: new Date(),
        priority: 'normal',
        status: 'pending',
        transferNotes: 'Simulated transfer for debugging',
        createdAt: new Date(),
        updatedAt: new Date(),
        orderNumber: 'SIM-001',
        tableIds: ['table1'],
        items: [
          { 
            name: 'Test Item 1', 
            quantity: 2, 
            price: 15.99,
            category: 'Test Category'
          },
          { 
            name: 'Test Item 2', 
            quantity: 1, 
            price: 8.50,
            category: 'Test Category'
          }
        ],
        totalAmount: 40.48,
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        notes: 'Test order notes',
        staffId: testStaffId
      };

      const localStorageKey = `manager_pending_${testOrderId}`;
      
      // Debug: Check localStorage before storing
      console.log('🔍 Before simulated transfer - localStorage length:', localStorage.length);
      console.log('🔍 Before simulated transfer - existing keys:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`  ${i}: ${key}`);
      }
      
      localStorage.setItem(localStorageKey, JSON.stringify(localStorageOrder));
      console.log('💾 Simulated transfer stored in localStorage:', localStorageKey);
      
      // Debug: Verify it was stored
      const storedData = localStorage.getItem(localStorageKey);
      console.log('🔍 Verification - stored data:', storedData);
      console.log('🔍 After simulated transfer - localStorage length:', localStorage.length);
      
      // Debug: Check if we can retrieve it
      const retrievedData = localStorage.getItem(localStorageKey);
      if (retrievedData) {
        try {
          const parsed = JSON.parse(retrievedData);
          console.log('✅ Successfully retrieved and parsed simulated order:', parsed);
        } catch (e) {
          console.error('❌ Failed to parse stored simulated data:', e);
        }
      } else {
        console.error('❌ Failed to retrieve stored simulated data immediately after storing!');
      }
      
      // Now test if the polling would find it
      console.log('🔍 Testing if polling would find this order...');
      
      // Simulate the getLocalStorageOrders function
      const pendingOrders: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('manager_pending_')) {
          console.log('✅ Found manager_pending key:', key);
          try {
            const orderDataStr = localStorage.getItem(key);
            if (!orderDataStr) continue;
            
            const orderData = JSON.parse(orderDataStr);
            console.log('📦 Parsed order data:', orderData);
            if (!orderData || !orderData.id) continue;
            
            pendingOrders.push({
              id: key.replace('manager_pending_', ''),
              orderId: orderData.id,
              ...orderData,
              order: orderData,
              transferredBy: orderData.transferredBy,
              transferredAt: new Date(orderData.transferredAt),
              status: 'pending',
              priority: 'normal',
              assignedTo: undefined,
              transferNotes: undefined
            });
            console.log('✅ Added simulated order from localStorage:', key);
          } catch (error) {
            console.error('❌ Error parsing simulated localStorage order for key:', key, error);
          }
        }
      }
      
      console.log('🎯 Simulated polling result:', pendingOrders.length, pendingOrders);
      
    } catch (error) {
      console.error('❌ Simulated transfer failed:', error);
    }
  };

  const clearTestOrders = () => {
    console.log('🧹 Clearing test orders from localStorage...');
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('manager_pending_test') || key.startsWith('test_key') || key.startsWith('sim_order'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ Removed:', key);
    });
    
    console.log('✅ Cleanup completed');
  };

  const showAllLocalStorage = () => {
    console.log('📊 All localStorage contents:');
    console.log('Total items:', localStorage.length);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        console.log(`${i}: ${key} = ${value?.substring(0, 100)}${value && value.length > 100 ? '...' : ''}`);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 9999, background: 'white', padding: '10px', border: '1px solid black', borderRadius: '5px', maxWidth: '200px' }}>
      <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>LocalStorage Debug</h4>
      <button onClick={testLocalStorage} style={{ margin: '2px', padding: '5px 10px', fontSize: '10px', width: '100%' }}>
        Test LocalStorage
      </button>
      <button onClick={simulateTransfer} style={{ margin: '2px', padding: '5px 10px', fontSize: '10px', width: '100%' }}>
        Simulate Transfer
      </button>
      <button onClick={showAllLocalStorage} style={{ margin: '2px', padding: '5px 10px', fontSize: '10px', width: '100%' }}>
        Show All
      </button>
      <button onClick={clearTestOrders} style={{ margin: '2px', padding: '5px 10px', fontSize: '10px', width: '100%' }}>
        Clear Tests
      </button>
      <div style={{ fontSize: '9px', marginTop: '5px', color: '#666' }}>
        Check console for results
      </div>
    </div>
  );
};

export default LocalStorageTest;