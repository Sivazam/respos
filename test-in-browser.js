// Test script to run in browser console
// Copy and paste this into the browser console on the main application

console.log('🧪 Starting Browser Transfer Test...');

// First, let's check if we can access the transfer function
if (typeof window !== 'undefined' && window.location) {
    console.log('✅ Running in browser environment');
    
    // Check if we're on the right page
    console.log('Current URL:', window.location.href);
    
    // Check for React DevTools and app state
    setTimeout(() => {
        // Try to find the transfer function
        const appElement = document.querySelector('#root');
        if (appElement) {
            console.log('✅ React app found');
            
            // Try to access the transfer function through React internals
            try {
                // Look for any global functions or state
                const globalKeys = Object.keys(window);
                const transferRelated = globalKeys.filter(key => 
                    key.toLowerCase().includes('transfer') || 
                    key.toLowerCase().includes('order')
                );
                
                console.log('Transfer-related globals:', transferRelated);
                
                // Check for localStorage data
                console.log('📊 Checking localStorage...');
                const allKeys = Object.keys(localStorage);
                const orderKeys = allKeys.filter(key => key.startsWith('temp_order_'));
                const managerKeys = allKeys.filter(key => key.startsWith('manager_pending_'));
                
                console.log('Temp orders:', orderKeys.length);
                console.log('Manager pending orders:', managerKeys.length);
                
                if (orderKeys.length > 0) {
                    console.log('📋 Found temp orders:');
                    orderKeys.forEach(key => {
                        const order = JSON.parse(localStorage.getItem(key));
                        console.log(`- ${key}: ${order.orderNumber} (${order.status})`);
                    });
                    
                    // Try to manually test transfer
                    const firstOrderKey = orderKeys[0];
                    const order = JSON.parse(localStorage.getItem(firstOrderKey));
                    
                    console.log('🔄 Attempting manual transfer for order:', order.id);
                    
                    // Simulate the transfer process
                    const managerKey = `manager_pending_${order.id}`;
                    const managerOrderData = {
                        ...order,
                        status: 'transferred',
                        transferredAt: new Date().toISOString(),
                        transferredBy: 'test-user'
                    };
                    
                    // Save to manager pending
                    localStorage.setItem(managerKey, JSON.stringify(managerOrderData));
                    
                    // Update original order
                    localStorage.setItem(firstOrderKey, JSON.stringify(managerOrderData));
                    
                    console.log('✅ Manual transfer completed');
                    console.log('🔍 Checking results...');
                    
                    // Verify results
                    const newManagerKeys = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_'));
                    const updatedOrder = JSON.parse(localStorage.getItem(firstOrderKey));
                    
                    console.log('Manager orders after transfer:', newManagerKeys.length);
                    console.log('Original order status:', updatedOrder.status);
                    
                    if (newManagerKeys.length > 0 && updatedOrder.status === 'transferred') {
                        console.log('🎉 SUCCESS: Transfer functionality is working!');
                        console.log('💡 Now check the Manager page to see if the order appears');
                    } else {
                        console.log('❌ Transfer test failed');
                    }
                    
                } else {
                    console.log('❌ No temp orders found. Please create an order first.');
                    console.log('💡 To create an order:');
                    console.log('1. Go to the POS page');
                    console.log('2. Add items to cart');
                    console.log('3. Select a table');
                    console.log('4. Create order');
                    console.log('5. Then run this test again');
                }
                
            } catch (error) {
                console.error('❌ Error during test:', error);
            }
        } else {
            console.log('❌ React app not found');
        }
    }, 2000);
} else {
    console.log('❌ Not running in browser environment');
}

console.log('🎯 Test initiated. Check console for results...');