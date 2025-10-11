# Feature Management System

This document tracks all features that have been commented out or hidden, along with instructions for restoring them.

## How to Use This System

1. **Before commenting out any feature**: Add an entry to this document
2. **When commenting code**: Use the standardized comment format
3. **To restore a feature**: Follow the restoration instructions in this document

## Comment Format Standards

When commenting out code, use this format:

```javascript
// FEATURE_DISABLED: [FEATURE_NAME] - [DATE] - [REASON]
// RESTORE_INSTRUCTIONS: [Brief description of how to restore]
// Original code below:
/* 
[commented out code here]
*/
```

## Currently Disabled Features

### None
*No features are currently disabled*

---

## Feature Categories

### 1. Authentication & User Management
- **Location**: `src/contexts/AuthContext.tsx`, `src/pages/auth/`
- **Features that could be disabled**:
  - Password reset functionality
  - User registration (force admin-only user creation)
  - Role-based access (temporarily make all users admin)
  - Account activation system

### 2. Inventory Management
- **Location**: `src/pages/inventory/`, `src/components/inventory/`
- **Features that could be disabled**:
  - Image upload for products
  - Vendor management
  - Stock tracking
  - Low stock alerts
  - Purchase tracking

### 3. Point of Sale (POS)
- **Location**: `src/pages/pos/`, `src/components/pos/`
- **Features that could be disabled**:
  - Receipt printing
  - Multiple payment methods (keep only cash)
  - GST calculations
  - Cart persistence
  - Product search/filtering

### 4. Returns & Refunds
- **Location**: `src/pages/pos/ReturnsPage.tsx`, `src/components/returns/`
- **Features that could be disabled**:
  - Return processing
  - Refund calculations
  - Return receipts

### 5. Reporting & Analytics
- **Location**: `src/pages/reports/`, `src/pages/dashboards/`
- **Features that could be disabled**:
  - Sales charts
  - Accounting statements
  - Activity logs
  - Dashboard statistics

### 6. Advanced Features
- **Location**: Various files
- **Features that could be disabled**:
  - Multi-location support
  - Invoice numbering system
  - Automatic stock deduction
  - Real-time updates

---

## Quick Disable Templates

### Template 1: Disable Entire Component
```javascript
// FEATURE_DISABLED: [FEATURE_NAME] - [DATE] - [REASON]
// RESTORE_INSTRUCTIONS: Uncomment the component and remove the placeholder
const DisabledComponent = () => (
  <div className="p-4 bg-gray-100 rounded-lg text-center">
    <p className="text-gray-600">This feature is temporarily disabled</p>
  </div>
);

/* ORIGINAL COMPONENT:
const OriginalComponent = () => {
  // ... original component code
};
*/

export default DisabledComponent;
```

### Template 2: Disable Feature Within Component
```javascript
const MyComponent = () => {
  // FEATURE_DISABLED: [FEATURE_NAME] - [DATE] - [REASON]
  // RESTORE_INSTRUCTIONS: Uncomment the feature code below
  
  return (
    <div>
      {/* Normal functionality */}
      
      {/* DISABLED FEATURE:
      <FeatureComponent />
      */}
      
      {/* Temporary placeholder */}
      <div className="text-gray-500 text-sm">Feature temporarily unavailable</div>
    </div>
  );
};
```

### Template 3: Disable Route
```javascript
// In App.tsx or routing file
// FEATURE_DISABLED: [ROUTE_NAME] - [DATE] - [REASON]
// RESTORE_INSTRUCTIONS: Uncomment the route and remove the disabled route

/* DISABLED ROUTE:
<Route path="/feature-path" element={<FeatureComponent />} />
*/

// Temporary disabled route
<Route path="/feature-path" element={
  <div className="p-8 text-center">
    <h2 className="text-xl font-semibold mb-4">Feature Temporarily Unavailable</h2>
    <p className="text-gray-600">This feature is currently disabled for maintenance.</p>
  </div>
} />
```

---

## Restoration Process

1. **Find the feature** in this document
2. **Locate the files** mentioned in the restoration instructions
3. **Search for the comment pattern** `FEATURE_DISABLED: [FEATURE_NAME]`
4. **Uncomment the code** and remove placeholder content
5. **Test the feature** to ensure it works correctly
6. **Update this document** by moving the feature to "Restored Features" section
7. **Commit changes** with a clear message

---

## Restored Features

### None
*No features have been restored yet*

---

## Best Practices

1. **Always document before disabling**: Add entry to this file first
2. **Use descriptive names**: Make feature names clear and searchable
3. **Include dates**: Track when features were disabled
4. **Provide context**: Explain why the feature was disabled
5. **Test after restoration**: Always verify functionality after uncommenting
6. **Keep placeholders user-friendly**: Show helpful messages instead of broken UI
7. **Update dependencies**: Check if disabled features affect other components

---

## Search Commands

To find disabled features in the codebase:

```bash
# Find all disabled features
grep -r "FEATURE_DISABLED" src/

# Find specific feature
grep -r "FEATURE_DISABLED: FeatureName" src/

# Find all restore instructions
grep -r "RESTORE_INSTRUCTIONS" src/
```

---

## Emergency Restore

If you need to quickly restore all features:

```bash
# This will show all disabled features
grep -r "FEATURE_DISABLED" src/ --include="*.tsx" --include="*.ts"

# Manual process: uncomment each found instance
```

**Note**: Always test thoroughly after bulk restoration.