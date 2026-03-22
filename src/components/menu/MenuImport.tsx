import React, { useState, useRef } from 'react';
import { Upload, Download, X, Check, AlertCircle, Loader } from 'lucide-react';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useLocations } from '../../contexts/LocationContext';
import toast from 'react-hot-toast';

interface ImportStats {
  categoriesCreated: number;
  categoriesSkipped: number;
  itemsCreated: number;
  itemsFailed: number;
}

interface ImportError {
  row: number;
  error: string;
  data: Record<string, string>;
}

interface ParsedMenuItem {
  rowNumber: number;
  categoryName: string;
  categoryDescription: string;
  categoryDisplayOrder: number;
  categoryIsActive: boolean;
  categoryImageUrl: string;
  itemName: string;
  itemDescription: string;
  itemPrice: number;
  itemIsVegetarian: boolean;
  itemIsAvailable: boolean;
  itemPreparationTime: number;
  itemSpiceLevel: 'mild' | 'medium' | 'hot' | 'extra_hot';
  itemHasHalfPortion: boolean;
  itemHalfPortionCost: number;
  itemImageUrl: string;
  selected: boolean;
}

interface MenuImportProps {
  onSuccess?: () => void;
  onCancel: () => void;
  onRefresh?: () => void;
}

const MenuImport: React.FC<MenuImportProps> = ({ onSuccess, onCancel, onRefresh }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [previewData, setPreviewData] = useState<ParsedMenuItem[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'results'>('upload');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user and location context
  const { currentUser } = useAuth();
  const { currentLocation, locations } = useLocations();

  // Parse CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
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
  };

  // Parse CSV content
  const parseCSV = (content: string): { headers: string[]; data: Record<string, string>[] } => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }

    const headers = parseCSVLine(lines[0]);
    const data: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return { headers, data };
  };

  // Parse boolean value
  const parseBoolean = (value: string): boolean => {
    const str = String(value).toLowerCase().trim();
    return str === 'true' || str === 'yes' || str === '1';
  };

  // Parse number value
  const parseNumber = (value: string, defaultValue = 0): number => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Parse spice level
  const parseSpiceLevel = (value: string): 'mild' | 'medium' | 'hot' | 'extra_hot' => {
    const validLevels = ['mild', 'medium', 'hot', 'extra_hot'];
    const level = String(value).toLowerCase().trim();
    return validLevels.includes(level) ? (level as any) : 'mild';
  };

  // Handle file selection
  const handleFile = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    // Validate user has location before proceeding
    if (!currentLocation?.id && !currentUser?.locationId) {
      toast.error('No location selected. Please select a location before importing.');
      return;
    }

    setIsProcessing(true);
    setStats(null);
    setErrors([]);
    setPreviewData([]);

    try {
      const content = await readFileAsText(file);

      const { headers, data } = parseCSV(content);

      if (data.length === 0) {
        toast.error('CSV file has no data rows');
        setIsProcessing(false);
        return;
      }

      // Parse all menu items for preview
      const parsedItems: ParsedMenuItem[] = data.map((row, index) => ({
        rowNumber: index + 2,
        categoryName: row.category_name?.trim() || '',
        categoryDescription: row.category_description?.trim() || '',
        categoryDisplayOrder: parseNumber(row.category_display_order, 99),
        categoryIsActive: parseBoolean(row.category_is_active ?? 'true'),
        categoryImageUrl: row.category_image_url?.trim() || '',
        itemName: row.item_name?.trim() || '',
        itemDescription: row.item_description?.trim() || '',
        itemPrice: parseNumber(row.item_price, 0),
        itemIsVegetarian: parseBoolean(row.item_is_vegetarian ?? 'false'),
        itemIsAvailable: parseBoolean(row.item_is_available ?? 'true'),
        itemPreparationTime: parseNumber(row.item_preparation_time, 15),
        itemSpiceLevel: parseSpiceLevel(row.item_spice_level ?? 'mild'),
        itemHasHalfPortion: parseBoolean(row.item_has_half_portion ?? 'false'),
        itemHalfPortionCost: parseNumber(row.item_half_portion_cost, 0),
        itemImageUrl: row.item_image_url?.trim() || '',
        selected: true, // All items selected by default
      }));

      // Validate parsed items
      const validationErrors = parsedItems
        .filter(item => !item.categoryName || !item.itemName || item.itemPrice <= 0)
        .map(item => `Row ${item.rowNumber}: Missing required fields`);

      if (validationErrors.length > 0) {
        toast.error(`Validation errors: ${validationErrors.slice(0, 3).join(', ')}...`);
        setIsProcessing(false);
        return;
      }

      // Set preview data and move to preview step
      setPreviewData(parsedItems);
      
      // Auto-select all categories
      const categories = new Set(parsedItems.map(item => item.categoryName));
      setSelectedCategories(categories);
      
      setImportStep('preview');
      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process CSV file');
      setIsProcessing(false);
    }
  };

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Process the import
  const processImport = async (data: Record<string, string>[]) => {
    const categoryMap = new Map<string, string>();
    const importStats: ImportStats = {
      categoriesCreated: 0,
      categoriesSkipped: 0,
      itemsCreated: 0,
      itemsFailed: 0,
    };
    const importErrors: ImportError[] = [];

    // Get franchise and location info
    let franchiseId: string | null = null;
    let locationId: string | null = null;
    const restaurantId = 'default-restaurant';

    // Priority 1: Use currentLocation from context (this is what the user is currently viewing)
    if (currentLocation?.id) {
      locationId = currentLocation.id;
      franchiseId = currentLocation.franchiseId || null;
    }
    // Priority 2: Use currentUser.locationId
    else if (currentUser?.locationId) {
      locationId = currentUser.locationId;
      franchiseId = currentUser.franchiseId || null;
    }

    // If still no location/franchise, try to fetch from Firestore
    if (!franchiseId) {
      try {
        const franchiseSnapshot = await getDocs(collection(db, 'franchises'));
        if (!franchiseSnapshot.empty) {
          franchiseId = franchiseSnapshot.docs[0].id;
        }
      } catch (e) {
        console.error('Error fetching franchises:', e);
      }
    }

    if (!locationId) {
      try {
        const locationSnapshot = await getDocs(collection(db, 'locations'));
        if (!locationSnapshot.empty) {
          locationId = locationSnapshot.docs[0].id;
        }
      } catch (e) {
        console.error('Error fetching locations:', e);
      }
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

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
          throw new Error('Missing category_name in row ' + rowNum);
        }

        if (!itemName) {
          throw new Error('Missing item_name in row ' + rowNum);
        }

        if (itemPrice <= 0) {
          throw new Error(`item_price must be greater than 0 for "${itemName}" (row ${rowNum})`);
        }

        // Create or get category
        let categoryId = categoryMap.get(categoryName);

        if (!categoryId) {
          // Check if category already exists IN THIS LOCATION
          try {
            const existingCategoryQuery = query(
              collection(db, 'categories'),
              where('name', '==', categoryName),
              where('locationId', '==', locationId)  // MUST match current location
            );
            const existingCategories = await getDocs(existingCategoryQuery);

            if (!existingCategories.empty) {
              categoryId = existingCategories.docs[0].id;
              importStats.categoriesSkipped++;
            } else {
              // Create new category
              const categoryData: any = {
                name: categoryName,
                description: categoryDescription,
                restaurantId,
                franchiseId,
                locationId,  // Use the SAME locationId as menu items
                displayOrder: categoryDisplayOrder,
                isActive: categoryIsActive,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              if (categoryImageUrl) {
                categoryData.imageUrl = categoryImageUrl;
              }

              const categoryRef = await addDoc(collection(db, 'categories'), categoryData);
              categoryId = categoryRef.id;
              importStats.categoriesCreated++;
            }

            categoryMap.set(categoryName, categoryId);
          } catch (categoryError) {
            console.error(`Error with category "${categoryName}":`, categoryError);
            throw new Error(`Failed to create/find category: ${categoryError instanceof Error ? categoryError.message : 'Unknown error'}`);
          }
        }

        // Create menu item
        const menuItemData: any = {
          name: itemName,
          description: itemDescription,
          price: itemPrice,
          categoryId,
          isVegetarian: itemIsVegetarian,
          isAvailable: itemIsAvailable,
          preparationTime: itemPreparationTime,
          spiceLevel: itemSpiceLevel,
          restaurantId,
          franchiseId,
          locationId,
          hasHalfPortion: itemHasHalfPortion,
          createdAt: new Date(),  // Use actual Date instead of serverTimestamp()
          updatedAt: new Date(),
        };

        if (itemImageUrl) {
          menuItemData.imageUrl = itemImageUrl;
        }

        if (itemHasHalfPortion && itemHalfPortionCost > 0) {
          menuItemData.halfPortionCost = itemHalfPortionCost;
        }

        const itemRef = await addDoc(collection(db, 'menuItems'), menuItemData);
        importStats.itemsCreated++;
      } catch (error) {
        console.error(`Row ${rowNum} failed:`, error);
        importStats.itemsFailed++;
        importErrors.push({
          row: rowNum,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
      }
    }

    setStats(importStats);
    setErrors(importErrors);
    setIsProcessing(false);

    if (importStats.itemsCreated > 0) {
      toast.success(`Successfully imported ${importStats.itemsCreated} menu items!`);
      // Trigger refresh of menu items context
      onRefresh?.();
      onSuccess?.();
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Toggle individual item selection
  const toggleItemSelection = (rowNumber: number) => {
    setPreviewData(prev => prev.map(item =>
      item.rowNumber === rowNumber ? { ...item, selected: !item.selected } : item
    ));
  };

  // Toggle category selection
  const toggleCategorySelection = (categoryName: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
    
    // Update item selection based on category
    setPreviewData(prev => prev.map(item => ({
      ...item,
      selected: item.categoryName === categoryName ? newSelected.has(categoryName) : item.selected
    })));
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    const allSelected = previewData.every(item => item.selected);
    if (allSelected) {
      // Deselect all
      setPreviewData(prev => prev.map(item => ({ ...item, selected: false })));
      setSelectedCategories(new Set());
    } else {
      // Select all
      setPreviewData(prev => prev.map(item => ({ ...item, selected: true })));
      setSelectedCategories(new Set(previewData.map(item => item.categoryName)));
    }
  };

  // Select all visible
  const selectAllVisible = () => {
    setPreviewData(prev => prev.map(item => ({ ...item, selected: true })));
    setSelectedCategories(new Set(previewData.map(item => item.categoryName)));
  };

  // Deselect all
  const deselectAll = () => {
    setPreviewData(prev => prev.map(item => ({ ...item, selected: false })));
    setSelectedCategories(new Set());
  };

  // Get unique categories with counts
  const getCategoriesSummary = () => {
    const categoryMap = new Map<string, { count: number; selected: number }>();
    previewData.forEach(item => {
      const existing = categoryMap.get(item.categoryName) || { count: 0, selected: 0 };
      existing.count++;
      if (item.selected) existing.selected++;
      categoryMap.set(item.categoryName, existing);
    });
    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      selected: data.selected,
    }));
  };

  // Process import with selected items only
  const processSelectedImport = async () => {
    const selectedItems = previewData.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to import');
      return;
    }

    setIsProcessing(true);
    setImportStep('results');
    
    // Convert back to raw data format for processing
    const rawData = selectedItems.map(item => ({
      category_name: item.categoryName,
      category_description: item.categoryDescription,
      category_display_order: String(item.categoryDisplayOrder),
      category_is_active: String(item.categoryIsActive),
      category_image_url: item.categoryImageUrl,
      item_name: item.itemName,
      item_description: item.itemDescription,
      item_price: String(item.itemPrice),
      item_is_vegetarian: String(item.itemIsVegetarian),
      item_is_available: String(item.itemIsAvailable),
      item_preparation_time: String(item.itemPreparationTime),
      item_spice_level: item.itemSpiceLevel,
      item_has_half_portion: String(item.itemHasHalfPortion),
      item_half_portion_cost: String(item.itemHalfPortionCost),
      item_image_url: item.itemImageUrl,
    }));
    
    await processImport(rawData);
  };

  // Go back to upload step
  const resetImport = () => {
    setPreviewData([]);
    setImportStep('upload');
    setSelectedCategories(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'category_name',
      'category_description',
      'category_display_order',
      'category_is_active',
      'item_name',
      'item_description',
      'item_price',
      'item_is_vegetarian',
      'item_is_available',
      'item_preparation_time',
      'item_spice_level',
      'item_has_half_portion',
      'item_half_portion_cost',
      'item_image_url',
      'category_image_url',
    ];

    const exampleRow = [
      'Starters',
      'Appetizers and snacks',
      '1',
      'true',
      'Samosa',
      'Crispy pastry with spiced potatoes',
      '80',
      'true',
      'true',
      '10',
      'mild',
      'false',
      '0',
      'https://example.com/samosa.jpg',
      'https://example.com/starters.jpg',
    ];

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Import Menu from CSV</h3>
        <button
          onClick={importStep === 'upload' ? onCancel : resetImport}
          className="text-gray-400 hover:text-gray-600"
          disabled={isProcessing}
        >
          <X size={20} />
        </button>
      </div>

      {/* Location Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Importing to:</h4>
        <p className="text-sm text-blue-700">
          <strong>Location:</strong> {currentLocation?.name || currentUser?.locationId || 'Loading...'}
        </p>
        <p className="text-sm text-blue-700">
          <strong>Franchise:</strong> {currentUser?.franchiseId || 'Loading...'}
        </p>
        <p className="text-sm text-blue-600 mt-2">
          ℹ️ Items will only be created for this location. Other locations and franchises will not be affected.
        </p>
      </div>

      {/* Upload Step */}
      {importStep === 'upload' && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-green-500 hover:bg-gray-50'
            }`}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Download Template Button */}
          <div className="text-center">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
            >
              <Download size={18} />
              Download CSV Template
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">CSV Format Requirements</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Required columns:</strong> category_name, item_name, item_price</li>
              <li>• Categories will be created automatically if they don't exist</li>
              <li>• Image URLs should be publicly accessible links</li>
              <li>• Spice levels: mild, medium, hot, extra_hot</li>
              <li>• Boolean fields accept: true/false, yes/no, 1/0</li>
            </ul>
          </div>
        </>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <>
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">📊 Preview Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm text-green-700">
              <div>
                <span className="font-semibold">Total Items:</span> {previewData.length}
              </div>
              <div>
                <span className="font-semibold">Categories:</span> {getCategoriesSummary().length}
              </div>
              <div>
                <span className="font-semibold">Selected:</span>{' '}
                {previewData.filter(item => item.selected).length}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {previewData.every(item => item.selected) ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={selectAllVisible}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Deselect All
            </button>
          </div>

          {/* Categories List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h4 className="font-medium text-gray-700">Categories</h4>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {getCategoriesSummary().map(category => (
                <div
                  key={category.name}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category.name)}
                      onChange={() => toggleCategorySelection(category.name)}
                      className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-500">
                      ({category.selected}/{category.count} items)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Preview Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
              <h4 className="font-medium text-gray-700">Menu Items Preview</h4>
              <span className="text-sm text-gray-500">
                Showing {previewData.length} items
              </span>
            </div>
            <div className="overflow-y-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={previewData.every(item => item.selected)}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-600">Category</th>
                    <th className="px-3 py-2 text-left text-gray-600">Item Name</th>
                    <th className="px-3 py-2 text-left text-gray-600">Price</th>
                    <th className="px-3 py-2 text-left text-gray-600">Veg</th>
                    <th className="px-3 py-2 text-left text-gray-600">Spice</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.map((item) => (
                    <tr
                      key={item.rowNumber}
                      className={`hover:bg-gray-50 ${!item.selected ? 'bg-gray-100 opacity-60' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.rowNumber)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.categoryName}</td>
                      <td className="px-3 py-2 text-gray-900 font-medium">{item.itemName}</td>
                      <td className="px-3 py-2 text-gray-700">₹{item.itemPrice}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.itemIsVegetarian ? '✓' : '✗'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded ${
                            item.itemSpiceLevel === 'mild'
                              ? 'bg-green-100 text-green-800'
                              : item.itemSpiceLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.itemSpiceLevel === 'hot'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.itemSpiceLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={processSelectedImport}
              disabled={isProcessing || previewData.filter(item => item.selected).length === 0}
              className={`flex-1 py-2.5 rounded-md font-medium text-white ${
                isProcessing || previewData.filter(item => item.selected).length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isProcessing ? 'Importing...' : `Import ${previewData.filter(item => item.selected).length} Selected Items`}
            </button>
            <button
              onClick={resetImport}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Processing State */}
      {isProcessing && importStep === 'results' && (
        <div className="text-center py-8">
          <Loader size={48} className="mx-auto text-green-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-700">Processing your import...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      )}

      {/* Results Step */}
      {stats && importStep === 'results' && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Check size={20} />
                <span className="text-sm font-medium">Categories Created</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.categoriesCreated}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Check size={20} />
                <span className="text-sm font-medium">Categories Skipped</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats.categoriesSkipped}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Check size={20} />
                <span className="text-sm font-medium">Items Created</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.itemsCreated}</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">Items Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{stats.itemsFailed}</p>
            </div>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Preview (First 5 rows)</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Category</th>
                      <th className="px-3 py-2 text-left text-gray-600">Item</th>
                      <th className="px-3 py-2 text-left text-gray-600">Price</th>
                      <th className="px-3 py-2 text-left text-gray-600">Veg</th>
                      <th className="px-3 py-2 text-left text-gray-600">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2 text-gray-700">{row.category_name}</td>
                        <td className="px-3 py-2 text-gray-700">{row.item_name}</td>
                        <td className="px-3 py-2 text-gray-700">₹{row.item_price}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {parseBoolean(row.item_is_vegetarian) ? '✓' : '✗'}
                        </td>
                        <td className="px-3 py-2 text-gray-700 truncate max-w-xs">
                          {row.item_image_url ? '✓' : '✗'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Errors ({errors.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                    <p className="text-red-700">
                      <strong>Row {error.row}:</strong> {error.error}
                    </p>
                  </div>
                ))}
                {errors.length > 10 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    ... and {errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => {
                onRefresh?.();
                onSuccess?.();
                resetImport();
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              Done
            </button>
            <button
              onClick={resetImport}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Import Another File
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MenuImport;
