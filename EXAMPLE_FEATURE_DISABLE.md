# Example: How to Disable a Feature

This document shows practical examples of how to disable features using our feature management system.

## Example 1: Disable Receipt Printing

### Step 1: Document the Change
Add to `FEATURE_TOGGLES.md`:

```markdown
### Receipt Printing - 2024-01-15
- **Reason**: Printer integration issues
- **Files**: `src/components/pos/ReceiptModal.tsx`, `src/pages/pos/POSPage.tsx`
- **Restore Instructions**: Uncomment print functionality and restore print button
```

### Step 2: Modify the Code

In `src/components/pos/ReceiptModal.tsx`:

```typescript
const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, onPrint, isReturn = false }) => {
  // FEATURE_DISABLED: Receipt Printing - 2024-01-15 - Printer integration issues
  // RESTORE_INSTRUCTIONS: Uncomment the handlePrint function and print button
  
  /* ORIGINAL PRINT FUNCTION:
  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=302');
      // ... print logic
    }
  };
  */

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* Receipt content */}
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* ... receipt display ... */}
        
        <div className="border-t border-gray-200 p-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
            Close
          </button>
          
          {/* FEATURE_DISABLED: Print Button - 2024-01-15 */}
          {/* RESTORE_INSTRUCTIONS: Uncomment the print button below */}
          {/*
          <button onClick={onPrint} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">
            Print
          </button>
          */}
          
          {/* Temporary disabled message */}
          <div className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
            Print temporarily unavailable
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Example 2: Disable Entire Returns Feature

### Step 1: Document the Change
```markdown
### Returns Processing - 2024-01-15
- **Reason**: Business policy change - no returns allowed temporarily
- **Files**: `src/App.tsx`, `src/layouts/DashboardLayout.tsx`
- **Restore Instructions**: Uncomment return routes and navigation links
```

### Step 2: Modify Routes

In `src/App.tsx`:

```typescript
// FEATURE_DISABLED: Returns Routes - 2024-01-15 - Business policy change
// RESTORE_INSTRUCTIONS: Uncomment all return-related routes below

/* DISABLED RETURN ROUTES:
<Route 
  path="/sales/returns" 
  element={
    <ProtectedRoute allowedRoles={['salesperson']}>
      <SalesReturnsPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/admin/returns" 
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <ReturnsPage />
    </ProtectedRoute>
  } 
/>
*/

// Temporary disabled route
<Route 
  path="/sales/returns" 
  element={
    <div className="p-8 text-center">
      <h2 className="text-xl font-semibold mb-4">Returns Temporarily Disabled</h2>
      <p className="text-gray-600">Returns processing is currently unavailable due to policy updates.</p>
    </div>
  } 
/>
```

### Step 3: Modify Navigation

In `src/layouts/DashboardLayout.tsx`:

```typescript
const salespersonLinks = [
  { name: 'Dashboard', href: '/sales', icon: <LayoutDashboard size={20} /> },
  { name: 'POS', href: '/sales/pos', icon: <ShoppingCart size={20} /> },
  { name: 'Product Catalog', href: '/sales/catalog', icon: <Store size={20} /> },
  { name: 'Orders', href: '/sales/orders', icon: <ClipboardList size={20} /> },
  
  // FEATURE_DISABLED: Returns Navigation - 2024-01-15 - Business policy change
  // RESTORE_INSTRUCTIONS: Uncomment the returns navigation link below
  // { name: 'Returns', href: '/sales/returns', icon: <ArrowUpCircle size={20} /> },
];
```

## Example 3: Disable Feature Within Component

### Step 1: Disable GST Calculations

In `src/contexts/CartContext.tsx`:

```typescript
const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { products, updateProduct } = useProducts();
  
  // FEATURE_DISABLED: GST Calculations - 2024-01-15 - Simplified pricing for testing
  // RESTORE_INSTRUCTIONS: Uncomment GST_RATE and restore cgst/sgst calculations
  
  // const GST_RATE = 0.05; // 5% GST (2.5% CGST + 2.5% SGST)
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // DISABLED: GST calculations
  // const cgst = subtotal * (GST_RATE / 2); // 2.5% CGST
  // const sgst = subtotal * (GST_RATE / 2); // 2.5% SGST
  
  // Temporary: No GST
  const cgst = 0;
  const sgst = 0;
  const total = subtotal + cgst + sgst;

  // ... rest of component
};
```

## How to Restore Features

### Using the Feature Manager Script

```bash
# List all disabled features
npm run features:list

# Validate documentation matches code
npm run features:validate

# Generate a report
npm run features:report
```

### Manual Restoration Process

1. **Find the feature** in `FEATURE_TOGGLES.md`
2. **Search for comments** using the pattern: `FEATURE_DISABLED: [FeatureName]`
3. **Uncomment the code** and remove placeholder content
4. **Test thoroughly** to ensure functionality works
5. **Update documentation** by moving the feature to "Restored Features"

### Search Commands

```bash
# Find all disabled features
grep -r "FEATURE_DISABLED" src/

# Find specific feature
grep -r "FEATURE_DISABLED: Receipt Printing" src/

# Find restore instructions
grep -r "RESTORE_INSTRUCTIONS" src/
```

This system ensures you can safely disable features while maintaining a clear path back to full functionality!