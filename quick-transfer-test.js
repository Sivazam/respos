// QUICK TRANSFER TEST
// Run this in the browser console to test if the manager page can read transferred orders

function quickTransferTest() {
  console.log('🧪 === QUICK TRANSFER TEST ===');
  
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
  
  console.log(`Found ${transferredOrders.length} transferred orders:`, transferredOrders);
  
  if (transferredOrders.length > 0) {
    const testOrder = transferredOrders[0];
    console.log('🧪 Testing with order:', testOrder.order.orderNumber);
    
    // 2. Create manager_pending_ key manually
    const managerKey = `manager_pending_${testOrder.order.id}`;
    localStorage.setItem(managerKey, JSON.stringify(testOrder.order));
    
    console.log('✅ Created manager key:', managerKey);
    console.log('📄 Manager order data:', testOrder.order);
    
    // 3. Check if manager page can find it
    console.log('🔍 Checking if manager page can find the order...');
    const managerData = localStorage.getItem(managerKey);
    if (managerData) {
      const parsedOrder = JSON.parse(managerData);
      console.log('✅ Manager order found:', parsedOrder.orderNumber);
      console.log('📊 Order details:', {
        id: parsedOrder.id,
        orderNumber: parsedOrder.orderNumber,
        status: parsedOrder.status,
        tableIds: parsedOrder.tableIds,
        totalAmount: parsedOrder.totalAmount
      });
      
      // 4. Trigger manager page reload
      console.log('🔄 Reloading manager page in 3 seconds...');
      setTimeout(() => {
        if (window.location.pathname.includes('/manager/pending-orders')) {
          window.location.reload();
        } else {
          console.log('❌ Not on manager page. Please navigate to /manager/pending-orders');
        }
      }, 3000);
      
    } else {
      console.log('❌ Failed to create manager order');
    }
    
  } else {
    console.log('❌ No transferred orders found. Please transfer an order first.');
  }
}

// Export function
window.quickTransferTest = quickTransferTest;

console.log('🔧 Quick transfer test loaded!');
console.log('👉 Run quickTransferTest() to test manual transfer');