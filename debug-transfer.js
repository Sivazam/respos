// COMPREHENSIVE TRANSFER DEBUG SCRIPT
// Copy and paste this into the browser console to debug the transfer process

function comprehensiveTransferDebug() {
  console.log('🔍 === COMPREHENSIVE TRANSFER DEBUG ===');
  
  // 1. Check current localStorage state
  console.log('\n📦 1. CURRENT LOCALSTATE STATE:');
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    allKeys.push(key);
  }
  
  const tempOrderKeys = allKeys.filter(key => key.startsWith('temp_order_'));
  const managerPendingKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
  
  console.log(`Total keys: ${allKeys.length}`);
  console.log(`Temp order keys: ${tempOrderKeys.length}`, tempOrderKeys);
  console.log(`Manager pending keys: ${managerPendingKeys.length}`, managerPendingKeys);
  
  // 2. Show details of temp orders
  console.log('\n📋 2. TEMP ORDER DETAILS:');
  const tempOrders = [];
  tempOrderKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      const order = JSON.parse(data);
      tempOrders.push(order);
      console.log(`📄 Order ${order.orderNumber} (${key}):`, {
        id: order.id,
        status: order.status,
        tableIds: order.tableIds,
        totalAmount: order.totalAmount,
        items: order.items.length,
        createdAt: order.createdAt
      });
    }
  });
  
  // 3. Show details of manager pending orders
  console.log('\n👨‍💼 3. MANAGER PENDING ORDER DETAILS:');
  const managerOrders = [];
  managerPendingKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      const order = JSON.parse(data);
      managerOrders.push(order);
      console.log(`📄 Order ${order.orderNumber} (${key}):`, {
        id: order.id,
        status: order.status,
        tableIds: order.tableIds,
        totalAmount: order.totalAmount,
        items: order.items.length,
        transferredAt: order.transferredAt,
        transferredBy: order.transferredBy
      });
    }
  });
  
  // 4. Test manual transfer
  console.log('\n🧪 4. MANUAL TRANSFER TEST:');
  if (tempOrders.length > 0) {
    const testOrder = tempOrders[0];
    console.log(`Testing transfer with order: ${testOrder.orderNumber}`);
    
    // Simulate transfer
    const transferredOrder = {
      ...testOrder,
      status: 'transferred',
      transferredAt: new Date().toISOString(),
      transferredBy: 'test-user',
      updatedAt: new Date().toISOString()
    };
    
    // Save to manager pending
    const managerKey = `manager_pending_${testOrder.id}`;
    localStorage.setItem(managerKey, JSON.stringify(transferredOrder));
    
    // Update original
    const tempKey = `temp_order_${testOrder.id}`;
    localStorage.setItem(tempKey, JSON.stringify(transferredOrder));
    
    console.log('✅ Manual transfer completed');
    console.log('📝 Manager key:', managerKey);
    console.log('📝 Transferred order:', transferredOrder);
    
    // 5. Verify transfer
    console.log('\n🔍 5. TRANSFER VERIFICATION:');
    const managerData = localStorage.getItem(managerKey);
    const tempData = localStorage.getItem(tempKey);
    
    if (managerData) {
      const managerOrder = JSON.parse(managerData);
      console.log('✅ Manager order found:', managerOrder.status === 'transferred' ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('❌ Manager order NOT found');
    }
    
    if (tempData) {
      const tempOrder = JSON.parse(tempData);
      console.log('✅ Temp order updated:', tempOrder.status === 'transferred' ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('❌ Temp order NOT found');
    }
    
  } else {
    console.log('❌ No temp orders available for testing');
  }
  
  // 6. Summary
  console.log('\n📊 6. SUMMARY:');
  console.log(`Temp orders: ${tempOrders.length}`);
  console.log(`Manager orders: ${managerOrders.length}`);
  console.log(`Transfer should work: ${tempOrders.length > 0 ? 'YES' : 'NO (no orders to transfer)'}`);
  
  return {
    tempOrders,
    managerOrders,
    keys: {
      all: allKeys,
      temp: tempOrderKeys,
      manager: managerPendingKeys
    }
  };
}

// Auto-refresh function for manager page
function setupManagerPageRefresh() {
  console.log('🔄 Setting up manager page auto-refresh...');
  
  // Check if we're on the manager page
  if (window.location.pathname.includes('/manager/pending-orders')) {
    console.log('✅ On manager page, setting up refresh');
    
    // Refresh every 5 seconds
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing manager orders...');
      window.location.reload();
    }, 5000);
    
    // Stop after 1 minute
    setTimeout(() => {
      clearInterval(interval);
      console.log('⏹️ Auto-refresh stopped');
    }, 60000);
    
    return interval;
  } else {
    console.log('❌ Not on manager page');
    return null;
  }
}

// Export functions
window.comprehensiveTransferDebug = comprehensiveTransferDebug;
window.setupManagerPageRefresh = setupManagerPageRefresh;

console.log('🔧 Comprehensive debug functions loaded!');
console.log('👉 Run comprehensiveTransferDebug() to debug the transfer process');
console.log('👉 Run setupManagerPageRefresh() to auto-refresh manager page');