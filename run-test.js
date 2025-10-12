// Simulate the transfer test in Node.js environment
// This will help us understand the transfer logic

console.log('🧪 Running Transfer Test Simulation...');

// Simulate localStorage
const localStorage = {
    data: {},
    getItem: function(key) {
        return this.data[key] || null;
    },
    setItem: function(key, value) {
        this.data[key] = value;
    },
    removeItem: function(key) {
        delete this.data[key];
    },
    key: function(index) {
        return Object.keys(this.data)[index] || null;
    },
    get length() {
        return Object.keys(this.data).length;
    }
};

// Create a sample order
const sampleOrder = {
    id: 'order-123',
    orderNumber: 'ORD-001',
    tableIds: ['table-1'],
    tableNumber: 'Table 1',
    items: [
        {
            id: 'item-1',
            name: 'Sample Item',
            price: 10.99,
            quantity: 2
        }
    ],
    totalAmount: 21.98,
    status: 'ongoing',
    customerName: 'Test Customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    staffId: 'staff-123',
    employeeId: 'staff-123'
};

// Store the sample order
localStorage.setItem('order_order-123', JSON.stringify(sampleOrder));

console.log('📊 Initial state:');
console.log('- Regular orders:', Object.keys(localStorage.data).filter(k => k.startsWith('order_')).length);
console.log('- Manager pending orders:', Object.keys(localStorage.data).filter(k => k.startsWith('manager_pending_')).length);

// Define the transfer function (simulated from the application)
function transferOrderToManager(orderId) {
    console.log('🔄 Starting transfer process for order:', orderId);
    
    try {
        // Get the order from localStorage
        const orderKey = `order_${orderId}`;
        const orderData = localStorage.getItem(orderKey);
        
        if (!orderData) {
            console.error('❌ Order not found:', orderKey);
            return false;
        }
        
        const order = JSON.parse(orderData);
        console.log('📋 Found order:', order);
        
        // Create manager pending order
        const managerOrderKey = `manager_pending_${orderId}`;
        const managerOrder = {
            id: order.id,
            orderNumber: order.orderNumber,
            tableIds: order.tableIds,
            items: order.items,
            totalAmount: order.totalAmount,
            customerName: order.customerName,
            tableNumber: order.tableNumber,
            status: 'pending',
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            staffId: order.staffId,
            transferredAt: new Date().toISOString(),
            transferredBy: order.employeeId || order.staffId,
            originalOrderKey: orderKey
        };
        
        // Store manager order
        localStorage.setItem(managerOrderKey, JSON.stringify(managerOrder));
        console.log('✅ Manager order created:', managerOrderKey);
        
        // Update original order status
        order.status = 'transferred';
        order.transferredAt = new Date().toISOString();
        order.transferredBy = order.employeeId || order.staffId;
        
        localStorage.setItem(orderKey, JSON.stringify(order));
        console.log('✅ Original order updated:', orderKey);
        
        console.log('🎯 Transfer completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Transfer failed:', error);
        return false;
    }
}

// Test the transfer
console.log('\n🔄 Testing transfer...');
const transferResult = transferOrderToManager('order-123');

console.log('\n📊 Final state:');
console.log('- Transfer result:', transferResult);
console.log('- Regular orders:', Object.keys(localStorage.data).filter(k => k.startsWith('order_')).length);
console.log('- Manager pending orders:', Object.keys(localStorage.data).filter(k => k.startsWith('manager_pending_')).length);

// Verify the transfer
const originalOrder = JSON.parse(localStorage.getItem('order_order-123'));
const managerOrder = JSON.parse(localStorage.getItem('manager_pending_order-123'));

console.log('\n🔍 Verification:');
console.log('- Original order status:', originalOrder.status);
console.log('- Manager order exists:', !!managerOrder);
console.log('- Manager order ID:', managerOrder?.id);
console.log('- Transferred by:', managerOrder?.transferredBy);
console.log('- Transferred at:', managerOrder?.transferredAt);

// Check consistency
const isConsistent = originalOrder.status === 'transferred' && managerOrder && managerOrder.id === originalOrder.id;
console.log('\n🎯 Consistency check:', isConsistent ? '✅ PASSED' : '❌ FAILED');

if (isConsistent) {
    console.log('🎉 Transfer functionality is working correctly!');
} else {
    console.log('❌ Transfer functionality has issues');
    console.log('Debug info:');
    console.log('- Original order:', originalOrder);
    console.log('- Manager order:', managerOrder);
}