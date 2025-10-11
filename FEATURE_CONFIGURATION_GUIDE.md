# Feature Configuration Guide

This guide explains how to configure features for different store types using the feature configuration system.

## Quick Start

To disable returns for a store, simply change the configuration in `src/config/features.ts`:

```typescript
// Change this line to switch store configurations
export const ACTIVE_STORE_CONFIG: keyof typeof storeConfigurations = 'simple';
```

Available configurations:
- `'full'` - All features enabled (default)
- `'basic'` - Basic retail store (limited returns)
- `'simple'` - Simple store (no returns, minimal features)

## Store Configurations

### Simple Store (`'simple'`)
Perfect for small stores that don't need complex features:
- ❌ **Returns disabled** - No return processing
- ❌ **Vendor management disabled** - Simplified inventory
- ❌ **Purchase tracking disabled** - Basic stock management
- ❌ **Accounting statements disabled** - Simple reporting
- ✅ **Basic POS** - Core sales functionality
- ✅ **Product management** - Add/edit products
- ✅ **Basic reports** - Sales summaries

### Basic Store (`'basic'`)
Good for standard retail operations:
- ✅ **Sales returns enabled** - Customer returns only
- ❌ **Purchase returns disabled** - No vendor returns
- ❌ **Invoice numbering disabled** - Simple receipts
- ✅ **Full inventory management** - Complete stock control
- ✅ **Vendor management** - Supplier tracking
- ✅ **Complete reporting** - All reports available

### Full Store (`'full'`)
Complete feature set for advanced operations:
- ✅ **All features enabled** - Complete functionality
- ✅ **Both sales and purchase returns** - Full return processing
- ✅ **Advanced reporting** - Including accounting statements
- ✅ **Invoice numbering** - Professional receipts
- ✅ **User management** - Role-based access

## Creating Custom Configurations

### Step 1: Add New Configuration

In `src/config/features.ts`, add your custom configuration:

```typescript
export const storeConfigurations = {
  // ... existing configurations
  
  // Your custom configuration
  myStore: {
    ...defaultFeatureConfig,
    returns: {
      enabled: false, // Disable all returns
      salesReturns: false,
      purchaseReturns: false,
      partialReturns: false,
      returnReceipts: false,
    },
    inventory: {
      ...defaultFeatureConfig.inventory,
      vendorManagement: true, // Keep vendor management
      purchaseTracking: false, // But disable purchase tracking
    },
    // Customize other features as needed
  },
} as const;
```

### Step 2: Activate Your Configuration

```typescript
export const ACTIVE_STORE_CONFIG: keyof typeof storeConfigurations = 'myStore';
```

## Feature Categories

### Returns & Refunds
```typescript
returns: {
  enabled: boolean,           // Master switch for all returns
  salesReturns: boolean,      // Customer returns
  purchaseReturns: boolean,   // Vendor returns
  partialReturns: boolean,    // Partial quantity returns (not implemented)
  returnReceipts: boolean,    // Print return receipts
}
```

### POS Features
```typescript
pos: {
  enabled: boolean,                // Master POS switch
  multiplePaymentMethods: boolean, // Cash, Card, UPI options
  gstCalculation: boolean,         // Automatic tax calculation
  receiptPrinting: boolean,        // Print receipts
  productSearch: boolean,          // Search products in POS
  categoryFiltering: boolean,      // Filter by category
}
```

### Inventory Management
```typescript
inventory: {
  enabled: boolean,           // Master inventory switch
  stockTracking: boolean,     // Track stock levels
  lowStockAlerts: boolean,    // Show low stock warnings
  stockUpdates: boolean,      // Manual stock adjustments
  vendorManagement: boolean,  // Manage suppliers
  purchaseTracking: boolean,  // Track purchases
  productImages: boolean,     // Upload product images
}
```

### User Management
```typescript
users: {
  enabled: boolean,           // Master user management switch
  roleBasedAccess: boolean,   // Different roles (admin, manager, sales)
  userRegistration: boolean,  // Allow new user registration
  accountActivation: boolean, // Require admin activation
  passwordReset: boolean,     // Password reset functionality
}
```

### Reports & Analytics
```typescript
reports: {
  enabled: boolean,              // Master reports switch
  salesReports: boolean,         // Sales analytics
  inventoryReports: boolean,     // Stock reports
  userActivityLogs: boolean,     // Activity tracking
  dashboardCharts: boolean,      // Visual charts
  exportFunctionality: boolean,  // Export to CSV
  accountingStatements: boolean, // Detailed accounting
}
```

## Using Features in Components

### Method 1: Feature Guard Component

```typescript
import FeatureGuard from '../components/ui/FeatureGuard';

<FeatureGuard feature="returns.enabled">
  <ReturnButton />
</FeatureGuard>

// With fallback message
<FeatureGuard 
  feature="returns.enabled"
  fallback={<div>Returns not available</div>}
>
  <ReturnButton />
</FeatureGuard>
```

### Method 2: Feature Hooks

```typescript
import { useReturnsFeatures } from '../hooks/useFeatures';

const MyComponent = () => {
  const { enabled, canProcessSalesReturns } = useReturnsFeatures();
  
  return (
    <div>
      {enabled && <ReturnSection />}
      {canProcessSalesReturns && <SalesReturnButton />}
    </div>
  );
};
```

### Method 3: Direct Feature Check

```typescript
import { features } from '../config/features';

const MyComponent = () => {
  if (!features.canProcessReturns()) {
    return <div>Returns disabled</div>;
  }
  
  return <ReturnInterface />;
};
```

## Navigation Integration

The navigation automatically hides/shows menu items based on feature configuration:

```typescript
// In DashboardLayout.tsx
const salespersonLinks = [
  { name: 'Dashboard', href: '/sales', icon: <LayoutDashboard size={20} /> },
  { name: 'POS', href: '/sales/pos', icon: <ShoppingCart size={20} /> },
  { name: 'Orders', href: '/sales/orders', icon: <ClipboardList size={20} /> },
  // This link only appears if returns are enabled
  ...(features.canProcessReturns() ? [
    { name: 'Returns', href: '/sales/returns', icon: <ArrowUpCircle size={20} /> }
  ] : []),
];
```

## Route Protection

Routes are automatically protected based on feature configuration:

```typescript
// In App.tsx
<Route 
  path="/sales/returns" 
  element={
    <ProtectedRoute allowedRoles={['salesperson']}>
      <FeatureGuard 
        feature="returns.enabled"
        fallback={
          <DisabledFeatureNotice 
            featureName="Returns Processing"
            reason="Returns processing is disabled for this store configuration."
          />
        }
      >
        <SalesReturnsPage />
      </FeatureGuard>
    </ProtectedRoute>
  } 
/>
```

## Best Practices

### 1. Always Use Feature Guards
Wrap feature-specific components with `FeatureGuard` to prevent errors:

```typescript
// Good
<FeatureGuard feature="returns.enabled">
  <ReturnButton onClick={processReturn} />
</FeatureGuard>

// Bad - could break if returns are disabled
<ReturnButton onClick={processReturn} />
```

### 2. Provide User-Friendly Messages
Use `DisabledFeatureNotice` for better user experience:

```typescript
<FeatureGuard 
  feature="returns.enabled"
  fallback={
    <DisabledFeatureNotice 
      featureName="Returns"
      reason="Returns are not available for this store type."
    />
  }
>
  <ReturnInterface />
</FeatureGuard>
```

### 3. Test All Configurations
Before deploying, test with different configurations:

```bash
# Test with simple store
# Change ACTIVE_STORE_CONFIG to 'simple' and test

# Test with basic store  
# Change ACTIVE_STORE_CONFIG to 'basic' and test

# Test with full store
# Change ACTIVE_STORE_CONFIG to 'full' and test
```

### 4. Document Custom Configurations
Always document why you created custom configurations and what they're for.

## Troubleshooting

### Feature Not Hiding
1. Check if you're using `FeatureGuard` correctly
2. Verify the feature path (e.g., `"returns.enabled"`)
3. Ensure the configuration is saved and the app is restarted

### Navigation Links Still Showing
1. Check `DashboardLayout.tsx` for proper feature checks
2. Verify the feature check function name
3. Clear browser cache and restart

### Routes Still Accessible
1. Ensure routes are wrapped with `FeatureGuard`
2. Check that the feature path matches the configuration
3. Verify the fallback component is working

## Example: Disabling Returns Completely

To disable all return functionality:

1. **Update configuration:**
```typescript
export const ACTIVE_STORE_CONFIG = 'simple'; // or create custom config
```

2. **Verify the simple configuration:**
```typescript
simple: {
  ...defaultFeatureConfig,
  returns: {
    enabled: false,
    salesReturns: false,
    purchaseReturns: false,
    partialReturns: false,
    returnReceipts: false,
  },
  // ... other settings
}
```

3. **Test the changes:**
- Returns menu items should disappear
- Return routes should show disabled message
- Return buttons should be hidden
- Return-related features should be inaccessible

That's it! The feature system will automatically handle hiding all return-related functionality throughout the application.