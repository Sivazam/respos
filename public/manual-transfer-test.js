// Manual Transfer Test Script
// This script provides functions to manually test the order transfer functionality

console.log('🧪 Manual Transfer Test Script Loaded');

function testTransferManually() {
    console.log('🔍 Starting manual transfer test...');
    
    // Check current localStorage state
    console.log('📊 Current localStorage state:');
    const allKeys = Object.keys(localStorage);
    const orderKeys = allKeys.filter(key => key.startsWith('order_'));
    const managerKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
    
    console.log('Total orders:', orderKeys.length);
    console.log('Manager pending orders:', managerKeys.length);
    
    // Show order details
    orderKeys.forEach(key => {
        const order = JSON.parse(localStorage.getItem(key));
        console.log(`Order ${key}:`, {
            id: order.id,
            status: order.status,
            items: order.items.length,
            transferred: order.transferred
        });
    });
    
    // Show manager pending details
    managerKeys.forEach(key => {
        const managerOrder = JSON.parse(localStorage.getItem(key));
        console.log(`Manager Order ${key}:`, {
            id: managerOrder.id,
            items: managerOrder.items.length,
            transferredAt: managerOrder.transferredAt
        });
    });
    
    // Find first available order for testing
    if (orderKeys.length > 0) {
        const firstOrderKey = orderKeys[0];
        const order = JSON.parse(localStorage.getItem(firstOrderKey));
        
        console.log('\n🎯 Testing transfer with order:', order.id);
        
        // Test the transfer function
        try {
            transferOrderToManager(order.id);
            console.log('✅ Transfer function executed successfully');
            
            // Check results after 2 seconds
            setTimeout(() => {
                console.log('\n📊 Post-transfer localStorage state:');
                const newManagerKeys = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_'));
                console.log('Manager pending orders after transfer:', newManagerKeys.length);
                
                // Check if our order was transferred
                const expectedManagerKey = `manager_pending_${order.id}`;
                const managerOrderExists = localStorage.getItem(expectedManagerKey);
                
                if (managerOrderExists) {
                    console.log('✅ SUCCESS: Order was transferred to manager!');
                    const managerOrder = JSON.parse(managerOrderExists);
                    console.log('Manager order details:', managerOrder);
                } else {
                    console.log('❌ FAILURE: Order was not transferred to manager');
                }
                
                // Check original order status
                const updatedOrder = JSON.parse(localStorage.getItem(firstOrderKey));
                console.log('Original order status after transfer:', updatedOrder.status);
                
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error during transfer:', error);
        }
    } else {
        console.log('❌ No orders found to test with');
    }
}

function simulateTransferFromUI() {
    console.log('🖱️ Simulating transfer from UI...');
    
    // Find first available order
    const allKeys = Object.keys(localStorage);
    const orderKeys = allKeys.filter(key => key.startsWith('order_'));
    
    if (orderKeys.length > 0) {
        const firstOrderKey = orderKeys[0];
        const order = JSON.parse(localStorage.getItem(firstOrderKey));
        
        console.log('Simulating "Go for Bill" click for order:', order.id);
        
        // Simulate the transfer
        transferOrderToManager(order.id);
        
        // Simulate page reload after 2 seconds (like in the real UI)
        setTimeout(() => {
            console.log('🔄 Reloading page (simulating UI behavior)...');
            // In real scenario, this would be: window.location.reload();
            console.log('Page reload simulated - check localStorage for results');
        }, 2000);
        
    } else {
        console.log('❌ No orders available to simulate transfer');
    }
}

function checkTransferConsistency() {
    console.log('🔍 Checking transfer consistency...');
    
    const allKeys = Object.keys(localStorage);
    const orderKeys = allKeys.filter(key => key.startsWith('order_'));
    const managerKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
    
    let inconsistentOrders = [];
    let orphanedManagerOrders = [];
    
    // Check for transferred orders without manager keys
    orderKeys.forEach(key => {
        const order = JSON.parse(localStorage.getItem(key));
        if (order.status === 'transferred') {
            const expectedManagerKey = `manager_pending_${order.id}`;
            if (!localStorage.getItem(expectedManagerKey)) {
                inconsistentOrders.push({
                    orderId: order.id,
                    status: order.status,
                    missingManagerKey: expectedManagerKey
                });
            }
        }
    });
    
    // Check for manager orders without corresponding transferred orders
    managerKeys.forEach(key => {
        const managerOrder = JSON.parse(localStorage.getItem(key));
        const originalOrderKey = `order_${managerOrder.id}`;
        const originalOrder = localStorage.getItem(originalOrderKey);
        
        if (!originalOrder) {
            orphanedManagerOrders.push({
                managerKey: key,
                orderId: managerOrder.id
            });
        } else {
            const order = JSON.parse(originalOrder);
            if (order.status !== 'transferred') {
                inconsistentOrders.push({
                    orderId: order.id,
                    status: order.status,
                    hasManagerKey: key
                });
            }
        }
    });
    
    console.log('📊 Consistency Check Results:');
    console.log('Inconsistent orders:', inconsistentOrders.length);
    console.log('Orphaned manager orders:', orphanedManagerOrders.length);
    
    if (inconsistentOrders.length > 0) {
        console.log('Inconsistent order details:', inconsistentOrders);
    }
    
    if (orphanedManagerOrders.length > 0) {
        console.log('Orphaned manager order details:', orphanedManagerOrders);
    }
    
    return {
        inconsistentOrders,
        orphanedManagerOrders,
        isConsistent: inconsistentOrders.length === 0 && orphanedManagerOrders.length === 0
    };
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.testTransferManually = testTransferManually;
    window.simulateTransferFromUI = simulateTransferFromUI;
    window.checkTransferConsistency = checkTransferConsistency;
    
    console.log('🎯 Test functions available:');
    console.log('- testTransferManually()');
    console.log('- simulateTransferFromUI()');
    console.log('- checkTransferConsistency()');
    console.log('\nUsage: testTransferManually()');
}