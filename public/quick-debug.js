// Quick Debug Script for Order Transfer Issues
// This script helps identify and fix common transfer problems

console.log('🔧 Quick Debug Script Loaded');

function quickDebug() {
    console.log('🚀 Starting quick debug...');
    
    // Check current state
    const allKeys = Object.keys(localStorage);
    const orderKeys = allKeys.filter(key => key.startsWith('order_'));
    const managerKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
    
    console.log('📊 Current State:');
    console.log('- Total orders:', orderKeys.length);
    console.log('- Manager pending orders:', managerKeys.length);
    
    let fixedOrders = [];
    let issuesFound = [];
    
    // Check each order for consistency
    orderKeys.forEach(key => {
        const order = JSON.parse(localStorage.getItem(key));
        
        if (order.status === 'transferred') {
            const expectedManagerKey = `manager_pending_${order.id}`;
            const managerOrder = localStorage.getItem(expectedManagerKey);
            
            if (!managerOrder) {
                issuesFound.push({
                    type: 'missing_manager_key',
                    orderId: order.id,
                    orderKey: key,
                    expectedManagerKey: expectedManagerKey
                });
                
                // Fix the issue by creating the manager key
                const managerOrderData = {
                    id: order.id,
                    items: order.items,
                    totalAmount: order.totalAmount,
                    customerName: order.customerName,
                    tableNumber: order.tableNumber,
                    transferredAt: new Date().toISOString(),
                    transferredBy: order.employeeId || 'unknown',
                    originalOrderKey: key
                };
                
                localStorage.setItem(expectedManagerKey, JSON.stringify(managerOrderData));
                fixedOrders.push(order.id);
                
                console.log(`✅ Fixed missing manager key for order ${order.id}`);
            }
        }
    });
    
    // Check for orphaned manager orders
    managerKeys.forEach(key => {
        const managerOrder = JSON.parse(localStorage.getItem(key));
        const originalOrderKey = `order_${managerOrder.id}`;
        const originalOrder = localStorage.getItem(originalOrderKey);
        
        if (!originalOrder) {
            issuesFound.push({
                type: 'orphaned_manager_order',
                managerKey: key,
                orderId: managerOrder.id
            });
            
            console.log(`⚠️ Found orphaned manager order: ${key}`);
        } else {
            const order = JSON.parse(originalOrder);
            if (order.status !== 'transferred') {
                issuesFound.push({
                    type: 'status_mismatch',
                    orderId: order.id,
                    currentStatus: order.status,
                    managerKey: key
                });
                
                // Fix the status
                order.status = 'transferred';
                localStorage.setItem(originalOrderKey, JSON.stringify(order));
                fixedOrders.push(order.id);
                
                console.log(`✅ Fixed status mismatch for order ${order.id}`);
            }
        }
    });
    
    // Final state check
    const finalManagerKeys = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_'));
    const transferredOrders = orderKeys.filter(key => {
        const order = JSON.parse(localStorage.getItem(key));
        return order.status === 'transferred';
    });
    
    console.log('\n📊 Debug Results:');
    console.log('- Issues found:', issuesFound.length);
    console.log('- Orders fixed:', fixedOrders.length);
    console.log('- Transferred orders:', transferredOrders.length);
    console.log('- Manager pending orders:', finalManagerKeys.length);
    
    if (issuesFound.length > 0) {
        console.log('\n🔍 Issues Details:');
        issuesFound.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.type}:`, issue);
        });
    }
    
    if (fixedOrders.length > 0) {
        console.log('\n✅ Fixed Orders:', fixedOrders);
    }
    
    const isConsistent = transferredOrders.length === finalManagerKeys.length;
    console.log('\n🎯 Consistency Check:', isConsistent ? '✅ PASSED' : '❌ FAILED');
    
    return {
        issuesFound,
        fixedOrders,
        isConsistent,
        transferredCount: transferredOrders.length,
        managerPendingCount: finalManagerKeys.length
    };
}

function checkTransferFunction() {
    console.log('🔍 Testing transfer function...');
    
    // Find a non-transferred order to test with
    const allKeys = Object.keys(localStorage);
    const orderKeys = allKeys.filter(key => key.startsWith('order_'));
    
    const availableOrder = orderKeys.find(key => {
        const order = JSON.parse(localStorage.getItem(key));
        return order.status !== 'transferred';
    });
    
    if (availableOrder) {
        const order = JSON.parse(localStorage.getItem(availableOrder));
        console.log('Testing with order:', order.id);
        
        // Test the transfer function
        try {
            const beforeManagerCount = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_')).length;
            
            transferOrderToManager(order.id);
            
            const afterManagerCount = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_')).length;
            
            console.log('Manager orders before:', beforeManagerCount);
            console.log('Manager orders after:', afterManagerCount);
            
            if (afterManagerCount > beforeManagerCount) {
                console.log('✅ Transfer function appears to be working');
            } else {
                console.log('❌ Transfer function may have issues');
            }
            
        } catch (error) {
            console.error('❌ Error testing transfer function:', error);
        }
    } else {
        console.log('❌ No available orders to test with');
    }
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.quickDebug = quickDebug;
    window.checkTransferFunction = checkTransferFunction;
    
    console.log('🎯 Debug functions available:');
    console.log('- quickDebug()');
    console.log('- checkTransferFunction()');
    console.log('\nUsage: quickDebug()');
}