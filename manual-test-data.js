// Simple script to create test data
// This can be run in the browser console

async function createTestData() {
  try {
    console.log('Creating test data...');
    
    // Import the test data creation function
    const { createAllTestData } = await import('./src/utils/createTestData.ts');
    
    // Call the function
    await createAllTestData();
    
    console.log('✅ Test data created successfully!');
    console.log('🔄 Refreshing the page...');
    
    // Refresh the page after 2 seconds
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Auto-execute for development
if (typeof window !== 'undefined') {
  // Add to global scope for easy access
  window.createTestData = createTestData;
  
  console.log('🔧 Test data creator loaded!');
  console.log('💡 Run createTestData() in the console to create test data');
}

export { createTestData };