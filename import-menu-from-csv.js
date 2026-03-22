/**
 * Menu Import Script from CSV
 * 
 * This script reads a CSV file and creates menu categories and menu items
 * in Firebase Firestore for the Millet Home Foods POS system.
 * 
 * Usage: node import-menu-from-csv.js <path-to-csv>
 * 
 * CSV Format (single combined CSV):
 * category_name,category_description,category_display_order,category_is_active,item_name,item_description,item_price,item_is_vegetarian,item_is_available,item_preparation_time,item_spice_level,item_has_half_portion,item_half_portion_cost,item_image_url,category_image_url
 * 
 * Example:
 * Starters,Appetizers and snacks,1,true,Samosa,Crispy pastry with spiced potatoes,80,true,true,10,mild,false,0,https://example.com/samosa.jpg,https://example.com/starters.jpg
 * Main Course,Main dishes served with rice/bread,2,true,Butter Chicken,Creamy tomato curry with chicken,320,false,true,20,medium,false,0,https://example.com/butter-chicken.jpg,https://example.com/main-course.jpg
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Firebase configuration (from src/firebase/config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyC9f76SkbwC6Dgef8WS6bIS_h5gRL9137k",
  authDomain: "restpossys.firebaseapp.com",
  projectId: "restpossys",
  storageBucket: "restpossys.firebasestorage.app",
  messagingSenderId: "626111912551",
  appId: "1:626111912551:web:21b11b07192e09fd2fd2c2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CSV parsing helper - handles quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row');
  }
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return { headers, data };
}

// Parse boolean value from CSV
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === 'yes' || str === '1';
}

// Parse number value from CSV
function parseNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Validate spice level
function parseSpiceLevel(value) {
  const validLevels = ['mild', 'medium', 'hot', 'extra_hot'];
  const level = String(value).toLowerCase().trim();
  return validLevels.includes(level) ? level : 'mild';
}

// Main import function
async function importMenuFromCSV(csvPath) {
  console.log('🚀 Starting menu import from CSV...\n');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`);
    process.exit(1);
  }
  
  // Parse CSV
  console.log(`📄 Reading CSV file: ${csvPath}`);
  const { headers, data } = parseCSV(csvPath);
  console.log(`   Found ${data.length} rows\n`);
  console.log(`   Headers: ${headers.join(', ')}\n`);
  
  // Track created categories and items
  const categoryMap = new Map(); // categoryName -> categoryId
  const stats = {
    categoriesCreated: 0,
    categoriesSkipped: 0,
    itemsCreated: 0,
    itemsFailed: 0,
    errors: []
  };
  
  // We need restaurantId, franchiseId, locationId for the data
  // For now, we'll use a placeholder - you may need to update these
  // Query to get existing franchise/location info
  const restaurantId = 'default-restaurant'; // You may need to update this
  
  // Try to get franchise info
  let franchiseId = null;
  let locationId = null;
  
  try {
    const franchiseSnapshot = await getDocs(collection(db, 'franchises'));
    if (!franchiseSnapshot.empty) {
      franchiseId = franchiseSnapshot.docs[0].id;
      console.log(`📍 Using franchise: ${franchiseId}`);
    }
  } catch (e) {
    console.log('⚠️  Could not fetch franchises, will use null');
  }
  
  try {
    const locationSnapshot = await getDocs(collection(db, 'locations'));
    if (!locationSnapshot.empty) {
      locationId = locationSnapshot.docs[0].id;
      console.log(`📍 Using location: ${locationId}`);
    }
  } catch (e) {
    console.log('⚠️  Could not fetch locations, will use null');
  }
  
  console.log('\n--- Processing Categories and Menu Items ---\n');
  
  // Process each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because CSV is 1-indexed and we skipped header
    
    try {
      // Extract category data
      const categoryName = row.category_name?.trim();
      const categoryDescription = row.category_description?.trim() || '';
      const categoryDisplayOrder = parseNumber(row.category_display_order, 99);
      const categoryIsActive = parseBoolean(row.category_is_active ?? 'true');
      const categoryImageUrl = row.category_image_url?.trim() || '';
      
      // Extract menu item data
      const itemName = row.item_name?.trim();
      const itemDescription = row.item_description?.trim() || '';
      const itemPrice = parseNumber(row.item_price, 0);
      const itemIsVegetarian = parseBoolean(row.item_is_vegetarian ?? 'false');
      const itemIsAvailable = parseBoolean(row.item_is_available ?? 'true');
      const itemPreparationTime = parseNumber(row.item_preparation_time, 15);
      const itemSpiceLevel = parseSpiceLevel(row.item_spice_level ?? 'mild');
      const itemHasHalfPortion = parseBoolean(row.item_has_half_portion ?? 'false');
      const itemHalfPortionCost = parseNumber(row.item_half_portion_cost, 0);
      const itemImageUrl = row.item_image_url?.trim() || '';
      
      // Validate required fields
      if (!categoryName) {
        throw new Error('Missing category_name');
      }
      
      if (!itemName) {
        throw new Error('Missing item_name');
      }
      
      if (itemPrice <= 0) {
        throw new Error('item_price must be greater than 0');
      }
      
      // Create or get category
      let categoryId = categoryMap.get(categoryName);
      
      if (!categoryId) {
        // Check if category already exists
        const existingCategoryQuery = query(
          collection(db, 'categories'),
          where('name', '==', categoryName)
        );
        const existingCategories = await getDocs(existingCategoryQuery);
        
        if (!existingCategories.empty) {
          categoryId = existingCategories.docs[0].id;
          console.log(`📁 Found existing category: "${categoryName}" (${categoryId})`);
          stats.categoriesSkipped++;
        } else {
          // Create new category
          const categoryData = {
            name: categoryName,
            description: categoryDescription,
            restaurantId: restaurantId,
            franchiseId: franchiseId,
            locationId: locationId,
            displayOrder: categoryDisplayOrder,
            isActive: categoryIsActive,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          // Add optional fields only if they have values
          if (categoryImageUrl) {
            categoryData.imageUrl = categoryImageUrl;
          }
          
          const categoryRef = await addDoc(collection(db, 'categories'), categoryData);
          categoryId = categoryRef.id;
          console.log(`✅ Created category: "${categoryName}" (${categoryId})`);
          stats.categoriesCreated++;
        }
        
        categoryMap.set(categoryName, categoryId);
      }
      
      // Create menu item
      const menuItemData = {
        name: itemName,
        description: itemDescription,
        price: itemPrice,
        categoryId: categoryId,
        isVegetarian: itemIsVegetarian,
        isAvailable: itemIsAvailable,
        preparationTime: itemPreparationTime,
        spiceLevel: itemSpiceLevel,
        restaurantId: restaurantId,
        franchiseId: franchiseId,
        locationId: locationId,
        hasHalfPortion: itemHasHalfPortion,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add optional fields only if they have values
      if (itemImageUrl) {
        menuItemData.imageUrl = itemImageUrl;
      }
      
      if (itemHasHalfPortion && itemHalfPortionCost > 0) {
        menuItemData.halfPortionCost = itemHalfPortionCost;
      }
      
      const itemRef = await addDoc(collection(db, 'menuItems'), menuItemData);
      console.log(`   ✅ Created item: "${itemName}" (${itemRef.id}) - ₹${itemPrice}`);
      stats.itemsCreated++;
      
    } catch (error) {
      console.error(`   ❌ Row ${rowNum} failed: ${error.message}`);
      stats.itemsFailed++;
      stats.errors.push({ row: rowNum, error: error.message, data: row });
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Categories Created: ${stats.categoriesCreated}`);
  console.log(`⏭️  Categories Skipped (already exist): ${stats.categoriesSkipped}`);
  console.log(`✅ Menu Items Created: ${stats.itemsCreated}`);
  console.log(`❌ Menu Items Failed: ${stats.itemsFailed}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    stats.errors.forEach(({ row, error, data }) => {
      console.log(`   Row ${row}: ${error}`);
      console.log(`      Data: ${JSON.stringify(data)}`);
    });
  }
  
  console.log('\n✨ Import completed!\n');
  
  return stats;
}

// Run the import
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.log('Usage: node import-menu-from-csv.js <path-to-csv>');
    console.log('\nExample:');
    console.log('  node import-menu-from-csv.js menu-data.csv');
    console.log('\nCSV Format:');
    console.log('  category_name,category_description,category_display_order,category_is_active,item_name,item_description,item_price,item_is_vegetarian,item_is_available,item_preparation_time,item_spice_level,item_has_half_portion,item_half_portion_cost,item_image_url,category_image_url');
    process.exit(1);
  }
  
  try {
    await importMenuFromCSV(csvPath);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
