import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Test menu items data
export const createTestMenuData = async () => {
  try {
    console.log('Creating test menu data...');
    
    const testMenuItems = [
      {
        name: 'Biryani',
        description: 'Hyderabadi Dum Biryani with aromatic basmati rice',
        price: 180,
        categoryId: 'test-category-1',
        isVegetarian: false,
        isAvailable: true,
        preparationTime: 20,
        spiceLevel: 'medium' as const,
        restaurantId: 'lltVGU',
        locationId: '40qzXj'
      },
      {
        name: 'Fried Rice',
        description: 'Veg Fried Rice with fresh vegetables',
        price: 120,
        categoryId: 'test-category-1',
        isVegetarian: true,
        isAvailable: true,
        preparationTime: 15,
        spiceLevel: 'mild' as const,
        restaurantId: 'lltVGU',
        locationId: '40qzXj'
      },
      {
        name: 'Noodles',
        description: 'Hakka Noodles with soy sauce and vegetables',
        price: 100,
        categoryId: 'test-category-1',
        isVegetarian: true,
        isAvailable: true,
        preparationTime: 12,
        spiceLevel: 'mild' as const,
        restaurantId: 'lltVGU',
        locationId: '40qzXj'
      },
      {
        name: 'Manchurian',
        description: 'Spicy vegetable manchurian with gravy',
        price: 140,
        categoryId: 'test-category-2',
        isVegetarian: true,
        isAvailable: true,
        preparationTime: 18,
        spiceLevel: 'medium' as const,
        restaurantId: 'lltVGU',
        locationId: '40qzXj'
      }
    ];

    // Add test menu items to Firestore and store their IDs
    const createdMenuIds: { [key: string]: string } = {};
    
    for (let i = 0; i < testMenuItems.length; i++) {
      const item = testMenuItems[i];
      const docRef = await addDoc(collection(db, 'menuItems'), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Store the mapping for sales data reference
      createdMenuIds[`test-menu-${i + 1}`] = docRef.id;
      console.log('Added test menu item:', item.name, 'with ID:', docRef.id);
    }

    // Update the sales data with real menu item IDs
    console.log('Menu item IDs created:', createdMenuIds);
    return createdMenuIds;
  } catch (error) {
    console.error('Error creating test menu data:', error);
    return {};
  }
};

// Test categories data
export const createTestCategoryData = async () => {
  try {
    console.log('Creating test category data...');
    
    const testCategories = [
      {
        name: 'Main Course',
        description: 'Rice and noodle dishes',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        displayOrder: 1,
        isActive: true
      },
      {
        name: 'Starters',
        description: 'Appetizers and snacks',
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        displayOrder: 2,
        isActive: true
      }
    ];

    // Add test categories to Firestore
    for (const category of testCategories) {
      await addDoc(collection(db, 'categories'), {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Added test category:', category.name);
    }

    console.log('Test category data created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating test category data:', error);
    return false;
  }
};

// Test orders data - matching Order interface exactly
export const createTestOrdersData = async () => {
  try {
    console.log('Creating test orders data...');
    
    const testOrders = [
      {
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        orderType: 'dinein',
        orderNumber: 'ORD-0001',
        items: [
          { 
            menuItemId: 'test-menu-1', 
            name: 'Biryani', 
            price: 180, 
            quantity: 2,
            modifications: [],
            notes: '',
            status: 'served'
          },
          { 
            menuItemId: 'test-menu-2', 
            name: 'Fried Rice', 
            price: 120, 
            quantity: 1,
            modifications: [],
            notes: '',
            status: 'served'
          }
        ],
        status: 'billed',
        totalAmount: 528,
        gstAmount: 48,
        subtotal: 480,
        createdBy: 'nadmin@m.com',
        customerName: 'Walk-in Customer',
        customerPhone: '',
        notes: '',
        specialInstructions: ''
      },
      {
        restaurantId: 'lltVGU',
        locationId: '40qzXj',
        orderType: 'takeaway',
        orderNumber: 'ORD-0002',
        items: [
          { 
            menuItemId: 'test-menu-3', 
            name: 'Noodles', 
            price: 100, 
            quantity: 1,
            modifications: [],
            notes: '',
            status: 'preparing'
          }
        ],
        status: 'preparing',
        totalAmount: 110,
        gstAmount: 10,
        subtotal: 100,
        createdBy: 'nadmin@m.com',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        notes: '',
        specialInstructions: 'Extra spicy please'
      }
    ];

    // Add test orders to Firestore
    for (const order of testOrders) {
      await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        servedAt: serverTimestamp(),
        billedAt: serverTimestamp()
      });
      console.log('Added test order:', order.orderNumber);
    }

    console.log('Test orders data created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating test orders data:', error);
    return false;
  }
};

// Create all test data
export const createAllTestData = async () => {
  try {
    console.log('=== STARTING TEST DATA CREATION ===');
    
    // 1. Create categories first
    await createTestCategoryData();
    console.log('✅ Categories created');
    
    // 2. Create menu items and get their IDs
    const menuIds = await createTestMenuData();
    console.log('✅ Menu items created');
    
    // 3. Create sales data with real menu item IDs
    await createTestSalesDataWithIds(menuIds);
    console.log('✅ Sales data created');
    
    // 4. Create orders data with real menu item IDs
    await createTestOrdersDataWithIds(menuIds);
    console.log('✅ Orders data created');
    
    console.log('🎉 All test data created successfully!');
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
};

// Helper function to create sales with real menu IDs
async function createTestSalesDataWithIds(menuIds: { [key: string]: string }) {
  const testSales = [
    {
      invoiceNumber: 'MHF-20241010-0001',
      items: [
        { 
          menuItemId: menuIds['test-menu-1'] || 'test-menu-1', 
          name: 'Biryani', 
          price: 180, 
          quantity: 2,
          modifications: [],
          notes: ''
        },
        { 
          menuItemId: menuIds['test-menu-2'] || 'test-menu-2', 
          name: 'Fried Rice', 
          price: 120, 
          quantity: 1,
          modifications: [],
          notes: ''
        }
      ],
      subtotal: 480,
      cgst: 24,
      sgst: 24,
      total: 528,
      paymentMethod: 'cash',
      locationId: '40qzXj',
      createdBy: 'nadmin@m.com'
    },
    {
      invoiceNumber: 'MHF-20241010-0002',
      items: [
        { 
          menuItemId: menuIds['test-menu-3'] || 'test-menu-3', 
          name: 'Noodles', 
          price: 100, 
          quantity: 1,
          modifications: [],
          notes: ''
        },
        { 
          menuItemId: menuIds['test-menu-4'] || 'test-menu-4', 
          name: 'Manchurian', 
          price: 140, 
          quantity: 1,
          modifications: [],
          notes: ''
        }
      ],
      subtotal: 240,
      cgst: 12,
      sgst: 12,
      total: 264,
      paymentMethod: 'card',
      locationId: '40qzXj',
      createdBy: 'nadmin@m.com'
    },
    {
      invoiceNumber: 'MHF-20241010-0003',
      items: [
        { 
          menuItemId: menuIds['test-menu-1'] || 'test-menu-1', 
          name: 'Biryani', 
          price: 180, 
          quantity: 1,
          modifications: [],
          notes: ''
        }
      ],
      subtotal: 180,
      cgst: 9,
      sgst: 9,
      total: 198,
      paymentMethod: 'upi',
      locationId: '40qzXj',
      createdBy: 'nadmin@m.com'
    }
  ];

  for (const sale of testSales) {
    await addDoc(collection(db, 'sales'), {
      ...sale,
      createdAt: serverTimestamp()
    });
    console.log('Added test sale:', sale.invoiceNumber);
  }
}

// Helper function to create orders with real menu IDs
async function createTestOrdersDataWithIds(menuIds: { [key: string]: string }) {
  const testOrders = [
    {
      restaurantId: 'lltVGU',
      locationId: '40qzXj',
      orderType: 'dinein',
      orderNumber: 'ORD-0001',
      items: [
        { 
          menuItemId: menuIds['test-menu-1'] || 'test-menu-1', 
          name: 'Biryani', 
          price: 180, 
          quantity: 2,
          modifications: [],
          notes: '',
          status: 'served'
        },
        { 
          menuItemId: menuIds['test-menu-2'] || 'test-menu-2', 
          name: 'Fried Rice', 
          price: 120, 
          quantity: 1,
          modifications: [],
          notes: '',
          status: 'served'
        }
      ],
      status: 'billed',
      totalAmount: 528,
      gstAmount: 48,
      subtotal: 480,
      createdBy: 'nadmin@m.com',
      customerName: 'Walk-in Customer',
      customerPhone: '',
      notes: '',
      specialInstructions: ''
    },
    {
      restaurantId: 'lltVGU',
      locationId: '40qzXj',
      orderType: 'takeaway',
      orderNumber: 'ORD-0002',
      items: [
        { 
          menuItemId: menuIds['test-menu-3'] || 'test-menu-3', 
          name: 'Noodles', 
          price: 100, 
          quantity: 1,
          modifications: [],
          notes: '',
          status: 'preparing'
        }
      ],
      status: 'preparing',
      totalAmount: 110,
      gstAmount: 10,
      subtotal: 100,
      createdBy: 'nadmin@m.com',
      customerName: 'John Doe',
      customerPhone: '+1234567890',
      notes: '',
      specialInstructions: 'Extra spicy please'
    }
  ];

  for (const order of testOrders) {
    await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      servedAt: serverTimestamp(),
      billedAt: serverTimestamp()
    });
    console.log('Added test order:', order.orderNumber);
  }
}