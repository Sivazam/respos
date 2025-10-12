// MANUAL TRANSFER TEST
// Run this in the browser console to test the transfer process manually

function testTransferManually() {
  console.log('🧪 === MANUAL TRANSFER TEST ===');
  
  // 1. Find a transferred order
  const transferredOrders = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('temp_order_')) {
      const data = localStorage.getItem(key);
      if (data) {
        const order = JSON.parse(data);
        if (order.status === 'transferred') {
          transferredOrders.push({ key, order });
        }
      }
    }
  }
  
  console.log(`Found ${transferredOrders.length} transferred orders`);
  
  if (transferredOrders.length > 0) {
    const testOrder = transferredOrders[0];
    console.log('Testing with order:', testOrder.order.orderNumber);
    
    // 2. Manually create manager_pending_ key
    const managerKey = `manager_pending_${testOrder.order.id}`;
    console.log('Creating manager key:', managerKey);
    
    localStorage.setItem(managerKey, JSON.stringify(testOrder.order));
    
    // 3. Verify it was created
    const managerData = localStorage.getItem(managerKey);
    if (managerData) {
      console.log('✅ Manager order created successfully');
      console.log('📄 Manager order data:', JSON.parse(managerData));
    } else {
      console.log('❌ Failed to create manager order');
    }
    
    // 4. Check if manager page would find it
    console.log('🔍 Checking if manager page would find this order...');
    let found = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('manager_pending_')) {
        found = true;
        console.log('✅ Manager page would find key:', key);
      }
    }
    
    if (!found) {
      console.log('❌ No manager_pending_ keys found');
    }
    
    return {
      success: true,
      managerKey,
      order: testOrder.order
    };
  } else {
    console.log('❌ No transferred orders found to test with');
    return {
      success: false,
      message: 'No transferred orders found'
    };
  }
}

// Function to check current localStorage state
function checkLocalStorageState() {
  console.log('🔍 === LOCALSTATE STATE CHECK ===');
  
  const tempOrders = [];
  const managerOrders = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('temp_order_')) {
      const data = localStorage.getItem(key);
      if (data) {
        const order = JSON.parse(data);
        tempOrders.push({ key, order });
      }
    } else if (key && key.startsWith('manager_pending_')) {
      const data = localStorage.getItem(key);
      if (data) {
        const order = JSON.parse(data);
        managerOrders.push({ key, order });
      }
    }
  }
  
  console.log(`📋 Temp orders: ${tempOrders.length}`);
  tempOrders.forEach(({ key, order }) => {
    console.log(`  - ${key}: ${order.orderNumber} (${order.status})`);
  });
  
  console.log(`👨‍💼 Manager orders: ${managerOrders.length}`);
  managerOrders.forEach(({ key, order }) => {
    console.log(`  - ${key}: ${order.orderNumber} (${order.status})`);
  });
  
  return { tempOrders, managerOrders };
}

// Export functions
window.testTransferManually = testTransferManually;
window.checkLocalStorageState = checkLocalStorageState;

console.log('🔧 Manual transfer test functions loaded!');
console.log('👉 Run testTransferManually() to test transfer');
console.log('👉 Run checkLocalStorageState() to check current state');