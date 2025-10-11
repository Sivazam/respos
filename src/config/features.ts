// Feature Configuration System
// This file controls which features are enabled/disabled for the application

import { FranchiseStoredFeatures, FranchisePlan } from '../types';

export interface FeatureConfig {
  // Core POS Features
  pos: {
    enabled: boolean;
    multiplePaymentMethods: boolean;
    gstCalculation: boolean;
    receiptPrinting: boolean;
    productSearch: boolean;
    categoryFiltering: boolean;
  };
  
  // Returns & Refunds
  returns: {
    enabled: boolean;
    salesReturns: boolean;
    purchaseReturns: boolean;
    partialReturns: boolean;
    returnReceipts: boolean;
  };
  
  // Inventory Management
  inventory: {
    enabled: boolean;
    stockTracking: boolean;
    lowStockAlerts: boolean;
    stockUpdates: boolean;
    purchaseTracking: boolean;
    productImages: boolean;
    stockReduction: boolean; // New: Controls ability to reduce stock manually
  };
  
  // User Management
  users: {
    enabled: boolean;
    roleBasedAccess: boolean;
    userRegistration: boolean;
    accountActivation: boolean;
    passwordReset: boolean;
  };
  
  // Menu Management
  menu: {
    enabled: boolean;
    addItem: boolean;
    editItem: boolean;
    deleteItem: boolean;
    manageCategories: boolean;
  };
  
  // Reporting & Analytics
  reports: {
    enabled: boolean;
    salesReports: boolean;
    inventoryReports: boolean;
    userActivityLogs: boolean;
    dashboardCharts: boolean;
    exportFunctionality: boolean;
    accountingStatements: boolean;
  };
  
  // Advanced Features
  advanced: {
    multiLocation: boolean;
    invoiceNumbering: boolean;
    automaticStockDeduction: boolean;
    realTimeUpdates: boolean;
    offlineMode: boolean;
  };
}

// Centralized franchise plan feature definitions
export const franchisePlanDefaults = {
  basic: {
    returns: false,
    inventory: true,
    reports: false,
    multiLocation: false,
    apiAccess: false,
    defaultCommission: 5,
    maxCommission: 10
  },
  premium: {
    returns: true,
    inventory: true,
    reports: true,
    multiLocation: false,
    apiAccess: false,
    defaultCommission: 7,
    maxCommission: 15
  },
  enterprise: {
    returns: true,
    inventory: true,
    reports: true,
    multiLocation: true,
    apiAccess: true,
    defaultCommission: 10,
    maxCommission: 25
  }
};

// Helper function to map franchise features to app config
export const mapFranchiseFeaturesToAppConfig = (franchiseFeatures: FranchiseStoredFeatures): FeatureConfig => {
  return {
    pos: {
      enabled: true,
      multiplePaymentMethods: true,
      gstCalculation: true,
      receiptPrinting: true,
      productSearch: true,
      categoryFiltering: true,
    },
    
    returns: {
      enabled: franchiseFeatures.returns,
      salesReturns: franchiseFeatures.returns,
      purchaseReturns: franchiseFeatures.returns,
      partialReturns: false,
      returnReceipts: franchiseFeatures.returns,
    },
    
    inventory: {
      enabled: franchiseFeatures.inventory,
      stockTracking: franchiseFeatures.inventory,
      lowStockAlerts: franchiseFeatures.inventory,
      stockUpdates: franchiseFeatures.inventory,
      purchaseTracking: franchiseFeatures.inventory,
      productImages: franchiseFeatures.inventory,
      stockReduction: franchiseFeatures.inventory,
    },
    
    users: {
      enabled: true,
      roleBasedAccess: true,
      userRegistration: true,
      accountActivation: true,
      passwordReset: true,
    },
    
    menu: {
      enabled: true,
      addItem: true,
      editItem: true,
      deleteItem: true,
      manageCategories: true,
    },
    
    reports: {
      enabled: franchiseFeatures.reports,
      salesReports: franchiseFeatures.reports,
      inventoryReports: franchiseFeatures.reports,
      userActivityLogs: franchiseFeatures.reports,
      dashboardCharts: franchiseFeatures.reports,
      exportFunctionality: franchiseFeatures.reports,
      accountingStatements: franchiseFeatures.reports,
    },
    
    advanced: {
      multiLocation: franchiseFeatures.multiLocation,
      invoiceNumbering: true,
      automaticStockDeduction: true,
      realTimeUpdates: true,
      offlineMode: false,
    },
  };
};

// Default configuration - modify this to enable/disable features
export const defaultFeatureConfig: FeatureConfig = {
  pos: {
    enabled: true,
    multiplePaymentMethods: true,
    gstCalculation: true,
    receiptPrinting: true,
    productSearch: true,
    categoryFiltering: true,
  },
  
  returns: {
    enabled: true, // Set to false to disable all return functionality
    salesReturns: true,
    purchaseReturns: true,
    partialReturns: false, // Not implemented yet
    returnReceipts: true,
  },
  
  inventory: {
    enabled: true,
    stockTracking: true,
    lowStockAlerts: true,
    stockUpdates: true,
    purchaseTracking: true,
    productImages: true,
    stockReduction: true, // Allow manual stock reduction
  },
  
  users: {
    enabled: true,
    roleBasedAccess: true,
    userRegistration: true,
    accountActivation: true,
    passwordReset: true,
  },
  
  menu: {
    enabled: true,
    addItem: true,
    editItem: true,
    deleteItem: true,
    manageCategories: true,
  },
  
  reports: {
    enabled: true,
    salesReports: true,
    inventoryReports: true,
    userActivityLogs: true,
    dashboardCharts: true,
    exportFunctionality: true,
    accountingStatements: true,
  },
  
  advanced: {
    multiLocation: false, // Not fully implemented
    invoiceNumbering: true,
    automaticStockDeduction: true,
    realTimeUpdates: true,
    offlineMode: false, // Not implemented yet
  },
};

// Store-specific configurations
export const storeConfigurations = {
  // Example: Simple store without returns and user management
  simple: {
    ...defaultFeatureConfig,
    returns: {
      enabled: false,
      salesReturns: false,
      purchaseReturns: false,
      partialReturns: false,
      returnReceipts: false,
    },
    inventory: {
      ...defaultFeatureConfig.inventory,
      purchaseTracking: false, // Simplified - no purchase history
      stockReduction: false,   // Simple mode - only allow adding stock
    },
    users: {
      enabled: false,
      roleBasedAccess: false,
      userRegistration: false,
      accountActivation: false,
      passwordReset: false,
    },
    reports: {
      ...defaultFeatureConfig.reports,
      accountingStatements: false,
    },
  },
  
  // Example: Basic retail store
  basic: {
    ...defaultFeatureConfig,
    returns: {
      enabled: true,
      salesReturns: true,
      purchaseReturns: false,
      partialReturns: false,
      returnReceipts: true,
    },
    advanced: {
      ...defaultFeatureConfig.advanced,
      invoiceNumbering: false,
    },
  },
  
  // Example: Full-featured store
  full: defaultFeatureConfig,
} as const;

// Current active configuration
// Change this to switch between different store configurations
export const ACTIVE_STORE_CONFIG: keyof typeof storeConfigurations = 'full';

// Get the current feature configuration
export const getFeatureConfig = (franchiseFeatures?: FranchiseStoredFeatures): FeatureConfig => {
  if (franchiseFeatures) {
    return mapFranchiseFeaturesToAppConfig(franchiseFeatures);
  }
  return storeConfigurations[ACTIVE_STORE_CONFIG];
};

// Helper functions to check specific features
export const isFeatureEnabled = (feature: string, config?: FeatureConfig): boolean => {
  const featureConfig = config || getFeatureConfig();
  const keys = feature.split('.');
  
  let current: any = featureConfig;
  for (const key of keys) {
    if (current[key] === undefined) return false;
    current = current[key];
  }
  
  return Boolean(current);
};

// Specific feature checkers
export const createFeatureCheckers = (config: FeatureConfig) => ({
  // Returns
  canProcessReturns: () => isFeatureEnabled('returns.enabled', config),
  canProcessSalesReturns: () => isFeatureEnabled('returns.enabled', config) && isFeatureEnabled('returns.salesReturns', config),
  canProcessPurchaseReturns: () => isFeatureEnabled('returns.enabled', config) && isFeatureEnabled('returns.purchaseReturns', config),
  canPrintReturnReceipts: () => isFeatureEnabled('returns.enabled', config) && isFeatureEnabled('returns.returnReceipts', config),
  
  // POS
  canUseMultiplePaymentMethods: () => isFeatureEnabled('pos.multiplePaymentMethods', config),
  canCalculateGST: () => isFeatureEnabled('pos.gstCalculation', config),
  canPrintReceipts: () => isFeatureEnabled('pos.receiptPrinting', config),
  
  // Inventory
  canTrackStock: () => isFeatureEnabled('inventory.stockTracking', config),
  canUploadProductImages: () => isFeatureEnabled('inventory.productImages', config),
  canReduceStock: () => isFeatureEnabled('inventory.stockReduction', config),
  canTrackPurchases: () => isFeatureEnabled('inventory.purchaseTracking', config),
  
  // Reports
  canViewSalesReports: () => isFeatureEnabled('reports.salesReports', config),
  canExportData: () => isFeatureEnabled('reports.exportFunctionality', config),
  canViewAccountingStatements: () => isFeatureEnabled('reports.accountingStatements', config),
  
  // Users
  canManageUsers: () => isFeatureEnabled('users.enabled', config),
  canRegisterUsers: () => isFeatureEnabled('users.userRegistration', config),
  
  // Menu
  canManageMenu: () => isFeatureEnabled('menu.enabled', config),
  canAddMenuItems: () => isFeatureEnabled('menu.enabled', config) && isFeatureEnabled('menu.addItem', config),
  canEditMenuItems: () => isFeatureEnabled('menu.enabled', config) && isFeatureEnabled('menu.editItem', config),
  canDeleteMenuItems: () => isFeatureEnabled('menu.enabled', config) && isFeatureEnabled('menu.deleteItem', config),
  canManageCategories: () => isFeatureEnabled('menu.enabled', config) && isFeatureEnabled('menu.manageCategories', config),
  
  // Advanced
  canUseInvoiceNumbering: () => isFeatureEnabled('advanced.invoiceNumbering', config),
  canAutoDeductStock: () => isFeatureEnabled('advanced.automaticStockDeduction', config),
});

// Default feature checkers (for backward compatibility)
export const features = createFeatureCheckers(defaultFeatureConfig);