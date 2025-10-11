import { db } from '@/lib/db';
import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// Test data creation utility
export async function createTestData() {
  try {
    console.log('Starting test data creation...');
    
    // Create test categories
    const categories = [
      {
        name: 'Beverages',
        description: 'Hot and cold beverages',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: 'Snacks',
        description: 'Quick bites and appetizers',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    console.log('Creating test categories...');
    for (let i = 0; i < categories.length; i++) {
      const categoryRef = doc(collection(db, 'categories'));
      await setDoc(categoryRef, categories[i]);
      console.log(`Created category: ${categories[i].name}`);
    }

    // Create test menu items
    const menuItems = [
      {
        name: 'Coffee',
        description: 'Freshly brewed coffee',
        price: 120,
        category: 'Beverages',
        image: '/images/coffee.jpg',
        available: true,
        ingredients: ['Coffee beans', 'Water', 'Milk'],
        allergens: [],
        spiceLevel: 0,
        customizable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: 'Sandwich',
        description: 'Club sandwich with fries',
        price: 180,
        category: 'Snacks',
        image: '/images/sandwich.jpg',
        available: true,
        ingredients: ['Bread', 'Chicken', 'Lettuce', 'Tomato', 'Mayo'],
        allergens: ['Gluten', 'Eggs'],
        spiceLevel: 0,
        customizable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: 'Tea',
        description: 'Refreshing green tea',
        price: 80,
        category: 'Beverages',
        image: '/images/tea.jpg',
        available: true,
        ingredients: ['Tea leaves', 'Water', 'Honey'],
        allergens: [],
        spiceLevel: 0,
        customizable: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    console.log('Creating test menu items...');
    for (let i = 0; i < menuItems.length; i++) {
      const menuItemRef = doc(collection(db, 'menuItems'));
      await setDoc(menuItemRef, menuItems[i]);
      console.log(`Created menu item: ${menuItems[i].name}`);
    }

    // Create test sales data
    const sales = [
      {
        items: [
          {
            id: 'coffee-1',
            name: 'Coffee',
            price: 120,
            quantity: 2,
            category: 'Beverages'
          }
        ],
        totalAmount: 240,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        orderStatus: 'completed',
        orderType: 'dine-in',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        staffId: 'nadmin@m.com',
        staffName: 'Admin User',
        customerInfo: {
          name: 'Walk-in Customer',
          email: '',
          phone: ''
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        items: [
          {
            id: 'sandwich-1',
            name: 'Sandwich',
            price: 180,
            quantity: 1,
            category: 'Snacks'
          },
          {
            id: 'tea-1',
            name: 'Tea',
            price: 80,
            quantity: 1,
            category: 'Beverages'
          }
        ],
        totalAmount: 260,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        orderStatus: 'completed',
        orderType: 'takeaway',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        staffId: 'nadmin@m.com',
        staffName: 'Admin User',
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        items: [
          {
            id: 'coffee-2',
            name: 'Coffee',
            price: 120,
            quantity: 1,
            category: 'Beverages'
          }
        ],
        totalAmount: 120,
        paymentMethod: 'upi',
        paymentStatus: 'paid',
        orderStatus: 'completed',
        orderType: 'dine-in',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        staffId: 'nadmin@m.com',
        staffName: 'Admin User',
        customerInfo: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+0987654321'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    console.log('Creating test sales data...');
    for (let i = 0; i < sales.length; i++) {
      const saleRef = doc(collection(db, 'sales'));
      await setDoc(saleRef, sales[i]);
      console.log(`Created sale record with total: ₹${sales[i].totalAmount}`);
    }

    // Create test orders data
    const orders = [
      {
        orderNumber: 'ORD-001',
        items: [
          {
            id: 'coffee-1',
            name: 'Coffee',
            price: 120,
            quantity: 2,
            category: 'Beverages'
          }
        ],
        totalAmount: 240,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        orderStatus: 'completed',
        orderType: 'dine-in',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        staffId: 'nadmin@m.com',
        staffName: 'Admin User',
        customerInfo: {
          name: 'Walk-in Customer',
          email: '',
          phone: ''
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        orderNumber: 'ORD-002',
        items: [
          {
            id: 'sandwich-1',
            name: 'Sandwich',
            price: 180,
            quantity: 1,
            category: 'Snacks'
          }
        ],
        totalAmount: 180,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        orderStatus: 'preparing',
        orderType: 'takeaway',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        staffId: 'nadmin@m.com',
        staffName: 'Admin User',
        customerInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    console.log('Creating test orders data...');
    for (let i = 0; i < orders.length; i++) {
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, orders[i]);
      console.log(`Created order: ${orders[i].orderNumber}`);
    }

    console.log('Test data creation completed successfully!');
    return {
      success: true,
      message: 'Created 2 categories, 3 menu items, 3 sales, and 2 orders'
    };

  } catch (error) {
    console.error('Error creating test data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Function to check existing data
export async function checkExistingData() {
  try {
    const collections = ['categories', 'menuItems', 'sales', 'orders'];
    const counts: Record<string, number> = {};

    for (const collectionName of collections) {
      const snapshot = await getDocs(collection(db, collectionName));
      counts[collectionName] = snapshot.size;
    }

    return counts;
  } catch (error) {
    console.error('Error checking existing data:', error);
    return null;
  }
}