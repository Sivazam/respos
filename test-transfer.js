// Test Transfer Functionality
// Run this script in the browser console to test the transfer functionality

console.log('🧪 Starting Transfer Test...');

// First, let's check if there are any orders to test with
const orderKeys = Object.keys(localStorage).filter(key => key.startsWith('order_'));
const managerKeys = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_'));

console.log('📊 Current State:');
console.log('- Regular orders:', orderKeys.length);
console.log('- Manager pending orders:', managerKeys.length);

if (orderKeys.length === 0) {
    console.log('❌ No orders found to test with. Please create an order first.');
} else {
    console.log('✅ Found orders to test with');
    
    // Find a non-transferred order
    const availableOrderKey = orderKeys.find(key => {
        const order = JSON.parse(localStorage.getItem(key));
        return order.status !== 'transferred';
    });
    
    if (availableOrderKey) {
        const order = JSON.parse(localStorage.getItem(availableOrderKey));
        console.log('🎯 Testing transfer with order:', order.id);
        
        // Check if transferOrderToManager function exists
        if (typeof transferOrderToManager === 'function') {
            console.log('✅ transferOrderToManager function found');
            
            // Test the transfer
            try {
                console.log('🔄 Executing transfer...');
                transferOrderToManager(order.id);
                
                // Check results after 2 seconds
                setTimeout(() => {
                    console.log('📊 Checking transfer results...');
                    
                    const newManagerKeys = Object.keys(localStorage).filter(key => key.startsWith('manager_pending_'));
                    const expectedManagerKey = `manager_pending_${order.id}`;
                    const managerOrderExists = localStorage.getItem(expectedManagerKey);
                    
                    console.log('Manager orders before:', managerKeys.length);
                    console.log('Manager orders after:', newManagerKeys.length);
                    
                    if (managerOrderExists) {
                        console.log('✅ SUCCESS: Order was transferred to manager!');
                        const managerOrder = JSON.parse(managerOrderExists);
                        console.log('Manager order details:', managerOrder);
                        
                        // Check original order status
                        const updatedOrder = JSON.parse(localStorage.getItem(availableOrderKey));
                        console.log('Original order status after transfer:', updatedOrder.status);
                        
                        if (updatedOrder.status === 'transferred') {
                            console.log('✅ Original order status updated correctly');
                        } else {
                            console.log('❌ Original order status not updated');
                        }
                        
                    } else {
                        console.log('❌ FAILURE: Order was not transferred to manager');
                        console.log('Expected manager key:', expectedManagerKey);
                    }
                }, 2000);
                
            } catch (error) {
                console.error('❌ Error during transfer:', error);
            }
            
        } else {
            console.log('❌ transferOrderToManager function not found');
            console.log('Available functions:', Object.keys(window).filter(key => key.includes('transfer')));
        }
    } else {
        console.log('❌ No available orders to test (all orders are already transferred)');
    }
}

console.log('🎯 Test initiated. Check console for results after 2 seconds.');