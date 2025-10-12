// Debug script to check order data storage
console.log('=== ORDER DATA DEBUG ===');

// Check all localStorage keys related to orders
const orderKeys = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('order') || key.includes('sale') || key.includes('completed'))) {
        orderKeys.push(key);
    }
}

console.log('Found order-related localStorage keys:', orderKeys);

// Check each key's data
orderKeys.forEach(key => {
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        console.log(`\n--- ${key} ---`);
        console.log('Type:', Array.isArray(data) ? `Array with ${data.length} items` : typeof data);
        if (Array.isArray(data) && data.length > 0) {
            console.log('First item structure:', Object.keys(data[0]));
            console.log('First item sample:', {
                id: data[0].id,
                orderNumber: data[0].orderNumber,
                totalAmount: data[0].totalAmount,
                status: data[0].status,
                paymentMethod: data[0].paymentMethod,
                items: data[0].items?.length || 0
            });
        }
    } catch (error) {
        console.log(`Error reading ${key}:`, error);
    }
});

console.log('\n=== END DEBUG ===');