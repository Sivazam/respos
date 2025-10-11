import { useMemo } from 'react';
import { getFeatureConfig, createFeatureCheckers, FeatureConfig, isFeatureEnabled } from '../config/features';
import { FranchiseStoredFeatures } from '../types';

// Hook to access feature configuration
export const useFeatures = (franchiseFeatures?: FranchiseStoredFeatures) => {
  const config = useMemo(() => getFeatureConfig(franchiseFeatures), [franchiseFeatures]);
  const featureCheckers = useMemo(() => createFeatureCheckers(config), [config]);
  
  return {
    config,
    features: featureCheckers,
    isEnabled: (feature: string) => isFeatureEnabled(feature, config),
  };
};

// Hook for specific feature categories
export const useReturnsFeatures = (franchiseFeatures?: FranchiseStoredFeatures) => {
  const { config } = useFeatures(franchiseFeatures);
  return {
    enabled: config.returns.enabled,
    canProcessSalesReturns: config.returns.enabled && config.returns.salesReturns,
    canProcessPurchaseReturns: config.returns.enabled && config.returns.purchaseReturns,
    canPrintReturnReceipts: config.returns.enabled && config.returns.returnReceipts,
  };
};

export const usePOSFeatures = (franchiseFeatures?: FranchiseStoredFeatures) => {
  const { config } = useFeatures(franchiseFeatures);
  return {
    enabled: config.pos.enabled,
    multiplePaymentMethods: config.pos.multiplePaymentMethods,
    gstCalculation: config.pos.gstCalculation,
    receiptPrinting: config.pos.receiptPrinting,
    productSearch: config.pos.productSearch,
    categoryFiltering: config.pos.categoryFiltering,
  };
};

export const useInventoryFeatures = (franchiseFeatures?: FranchiseStoredFeatures) => {
  const { config } = useFeatures(franchiseFeatures);
  return {
    enabled: config.inventory.enabled,
    stockTracking: config.inventory.stockTracking,
    lowStockAlerts: config.inventory.lowStockAlerts,
    stockUpdates: config.inventory.stockUpdates,
    purchaseTracking: config.inventory.purchaseTracking,
    productImages: config.inventory.productImages,
  };
};

export const useReportsFeatures = (franchiseFeatures?: FranchiseStoredFeatures) => {
  const { config } = useFeatures(franchiseFeatures);
  return {
    enabled: config.reports.enabled,
    salesReports: config.reports.salesReports,
    inventoryReports: config.reports.inventoryReports,
    userActivityLogs: config.reports.userActivityLogs,
    dashboardCharts: config.reports.dashboardCharts,
    exportFunctionality: config.reports.exportFunctionality,
    accountingStatements: config.reports.accountingStatements,
  };
};