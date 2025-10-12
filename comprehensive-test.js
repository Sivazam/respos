// Comprehensive Transfer Test
// This test simulates the complete transfer workflow

console.log('🚀 Starting Comprehensive Transfer Test...');

// Test 1: Check Environment
console.log('\n📋 Test 1: Environment Check');
console.log('- URL:', window?.location?.href);
console.log('- LocalStorage available:', typeof Storage !== 'undefined');
console.log('- Console functions available:', typeof console.log !== 'undefined');

// Test 2: Check Current Data State
console.log('\n📊 Test 2: Current Data State');
const allKeys = Object.keys(localStorage);
const tempOrderKeys = allKeys.filter(key => key.startsWith('temp_order_'));
const managerKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
const regularOrderKeys = allKeys.filter(key => key.startsWith('order_'));

console.log('- Total localStorage keys:', allKeys.length);
console.log('- Temp orders (temp_order_):', tempOrderKeys.length);
console.log('- Manager pending (manager_pending_):', managerKeys.length);
console.log('- Regular orders (order_):', regularOrderKeys.length);

// Test 3: Data Integrity Check
console.log('\n🔍 Test 3: Data Integrity Check');
let corruptedOrders = [];
let validOrders = [];

tempOrderKeys.forEach(key => {
    try {
        const order = JSON.parse(localStorage.getItem(key));
        if (order && order.id && order.orderNumber) {
            validOrders.push({ key, order });
            console.log(`✅ Valid order: ${key} - ${order.orderNumber} (${order.status})`);
        } else {
            corruptedOrders.push(key);
            console.log(`❌ Corrupted order: ${key}`);
        }
    } catch (error) {
        corruptedOrders.push(key);
        console.log(`❌ Error parsing ${key}:`, error.message);
    }
});

// Test 4: Transfer Function Simulation
console.log('\n🔄 Test 4: Transfer Function Simulation');

if (validOrders.length > 0) {
    const testOrder = validOrders[0];
    console.log(`Testing with order: ${testOrder.key} - ${testOrder.order.orderNumber}`);
    
    // Simulate the transfer process
    const orderId = testOrder.order.id;
    const staffId = 'test-user-' + Date.now();
    
    console.log('🔄 Starting transfer simulation...');
    
    // Step 1: Create manager pending order
    const managerKey = `manager_pending_${orderId}`;
    const managerOrderData = {
        ...testOrder.order,
        status: 'transferred',
        transferredAt: new Date().toISOString(),
        transferredBy: staffId,
        originalOrderKey: testOrder.key
    };
    
    localStorage.setItem(managerKey, JSON.stringify(managerOrderData));
    console.log('✅ Manager order created:', managerKey);
    
    // Step 2: Update original order
    localStorage.setItem(testOrder.key, JSON.stringify(managerOrderData));
    console.log('✅ Original order updated');
    
    // Step 3: Verify transfer
    const managerOrder = JSON.parse(localStorage.getItem(managerKey));
    const updatedOrder = JSON.parse(localStorage.getItem(testOrder.key));
    
    console.log('🔍 Transfer Verification:');
    console.log('- Manager order exists:', !!managerOrder);
    console.log('- Original order status:', updatedOrder.status);
    console.log('- Transferred by:', managerOrder.transferredBy);
    console.log('- Transferred at:', managerOrder.transferredAt);
    
    const transferSuccess = managerOrder && updatedOrder.status === 'transferred';
    console.log('- Transfer success:', transferSuccess ? '✅ YES' : '❌ NO');
    
    // Test 5: Manager Page Simulation
    console.log('\n📱 Test 5: Manager Page Simulation');
    
    // Simulate what the manager page does
    const managerOrders = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('manager_pending_')) {
            try {
                const orderData = JSON.parse(localStorage.getItem(key));
                managerOrders.push({
                    key,
                    order: orderData
                });
            } catch (error) {
                console.log(`❌ Error parsing manager order ${key}:`, error.message);
            }
        }
    }
    
    console.log('- Manager orders found:', managerOrders.length);
    managerOrders.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.key}: ${item.order.orderNumber} (${item.order.status})`);
    });
    
    // Test 6: Consistency Check
    console.log('\n🎯 Test 6: Consistency Check');
    
    let consistentTransfers = 0;
    let inconsistentTransfers = 0;
    
    tempOrderKeys.forEach(key => {
        const order = JSON.parse(localStorage.getItem(key));
        if (order.status === 'transferred') {
            const expectedManagerKey = `manager_pending_${order.id}`;
            const managerOrder = localStorage.getItem(expectedManagerKey);
            
            if (managerOrder) {
                consistentTransfers++;
                console.log(`✅ Consistent transfer: ${order.id}`);
            } else {
                inconsistentTransfers++;
                console.log(`❌ Inconsistent transfer: ${order.id} (missing manager key)`);
            }
        }
    });
    
    console.log('\n📊 Final Results:');
    console.log('- Valid orders:', validOrders.length);
    console.log('- Corrupted orders:', corruptedOrders.length);
    console.log('- Consistent transfers:', consistentTransfers);
    console.log('- Inconsistent transfers:', inconsistentTransfers);
    console.log('- Manager orders available:', managerOrders.length);
    
    const overallSuccess = transferSuccess && consistentTransfers > 0 && inconsistentTransfers === 0;
    console.log('\n🎉 Overall Test Result:', overallSuccess ? '✅ PASSED' : '❌ FAILED');
    
    if (overallSuccess) {
        console.log('\n💡 Next Steps:');
        console.log('1. Go to the Manager page');
        console.log('2. Check if the transferred order appears');
        console.log('3. Verify the refresh button shows the correct count');
        console.log('4. Test the "Go for Bill" functionality from the staff side');
    } else {
        console.log('\n🔧 Issues Found:');
        if (corruptedOrders.length > 0) {
            console.log('- Corrupted orders need to be cleaned up');
        }
        if (inconsistentTransfers > 0) {
            console.log('- Inconsistent transfers need to be fixed');
        }
        if (!transferSuccess) {
            console.log('- Transfer simulation failed');
        }
    }
    
} else {
    console.log('❌ No valid orders found to test with');
    console.log('\n💡 To create test data:');
    console.log('1. Go to the POS page');
    console.log('2. Add items to cart');
    console.log('3. Select a table');
    console.log('4. Create order');
    console.log('5. Run this test again');
}

console.log('\n🏁 Comprehensive Test Complete');