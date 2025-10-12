// QUICK DEBUG SCRIPT
// Run this to quickly check the transfer issue

function quickDebug() {
  console.log('🔍 === QUICK DEBUG ===');
  
  // 1. Check for transferred orders
  const transferredOrders = [];
  const managerOrders = [];
  
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
    } else if (key && key.startsWith('manager_pending_')) {
      const data = localStorage.getItem(key);
      if (data) {
        const order = JSON.parse(data);
        managerOrders.push({ key, order });
      }
    }
  }
  
  console.log(`📋 Transferred temp orders: ${transferredOrders.length}`);
  console.log(`👨‍💼 Manager orders: ${managerOrders.length}`);
  
  // 2. If we have transferred orders but no manager orders, fix it
  if (transferredOrders.length > 0 && managerOrders.length === 0) {
    console.log('🔧 Found transferred orders but no manager orders - fixing...');
    
    transferredOrders.forEach(({ key, order }) => {
      const managerKey = `manager_pending_${order.id}`;
      console.log(`Creating ${managerKey}...`);
      localStorage.setItem(managerKey, JSON.stringify(order));
    });
    
    console.log('✅ Fix completed! Check manager page now.');
  } else if (managerOrders.length > 0) {
    console.log('✅ Manager orders exist - check manager page');
  } else {
    console.log('❌ No transferred orders found - create an order and transfer it first');
  }
  
  return { transferredOrders, managerOrders };
}

// Export function
window.quickDebug = quickDebug;

console.log('🔧 Quick debug loaded!');
console.log('👉 Run quickDebug() to fix transfer issues');