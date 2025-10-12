import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { OrderItem } from '../../types';

const TestOrderFix: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentLocation } = useLocations();
  const { menuItems } = useMenuItems();
  const { temporaryOrder, startTemporaryOrder, addItemToTemporaryOrder, createPartialOrder, clearCurrentOrder } = useTemporaryOrder();
  
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    if (!currentUser || !currentLocation) {
      setTestResult('❌ User not authenticated or no location selected');
      return;
    }

    if (menuItems.length === 0) {
      setTestResult('❌ No menu items available');
      return;
    }

    setIsLoading(true);
    setTestResult('');

    try {
      console.log('🧪 Testing order creation fix...');
      
      // Step 1: Start a temporary order
      console.log('📝 Step 1: Starting temporary order...');
      await startTemporaryOrder(['test-table-1'], 'dinein', 'in-store');
      console.log('✅ Temporary order started');
      
      // Step 2: Add an item to the order
      console.log('🍽️ Step 2: Adding item to order...');
      const firstMenuItem = menuItems[0];
      const orderItem: OrderItem = {
        id: `test-item-${Date.now()}`,
        menuItemId: firstMenuItem.id,
        name: firstMenuItem.name,
        price: firstMenuItem.price,
        quantity: 1,
        modifications: [],
        notes: 'Test order item - table creation fix',
        addedAt: new Date(),
      };
      
      addItemToTemporaryOrder(orderItem);
      console.log('✅ Item added to order');
      
      // Step 3: Create the partial order in Firestore
      console.log('💾 Step 3: Creating partial order in Firestore...');
      const createdOrder = await createPartialOrder();
      console.log('✅ Partial order created in Firestore:', createdOrder);
      
      setTestResult(`✅ Test successful! Order ID: ${createdOrder.id}, Order Number: ${createdOrder.orderNumber || 'N/A'}`);
      
      // Clear the order after successful test
      setTimeout(() => {
        clearCurrentOrder();
        console.log('🧹 Test order cleared');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">🧪 Order Creation Fix Test</h2>
      
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm"><strong>User:</strong> {currentUser?.email || 'Not authenticated'}</p>
          <p className="text-sm"><strong>Location:</strong> {currentLocation?.name || 'No location'}</p>
          <p className="text-sm"><strong>Menu Items:</strong> {menuItems.length}</p>
          <p className="text-sm"><strong>Temp Order:</strong> {temporaryOrder ? `${temporaryOrder.items.length} items` : 'None'}</p>
        </div>

        <button
          onClick={runTest}
          disabled={isLoading || !currentUser || !currentLocation || menuItems.length === 0}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? '🔄 Testing Fix...' : '🧪 Test Order Creation Fix'}
        </button>

        {testResult && (
          <div className={`p-3 rounded ${testResult.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="text-sm font-mono">{testResult}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>This test verifies:</p>
          <ol className="list-decimal list-inside">
            <li>Test table creation if it doesn't exist</li>
            <li>Temporary order creation</li>
            <li>Item addition to order</li>
            <li>Partial order persistence</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestOrderFix;