import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FranchiseProvider } from './contexts/FranchiseContext';
import { RestaurantProvider } from './contexts/RestaurantContext';
import { TableProvider } from './contexts/TableContext';
import { OrderProvider } from './contexts/OrderContext';
import { LocationProvider } from './contexts/LocationContext';
import { CategoryProvider } from './contexts/CategoryContext';
import { ProductProvider } from './contexts/ProductContext';
import { VendorProvider } from './contexts/VendorContext';
import { StockProvider } from './contexts/StockContext';
import { CartProvider } from './contexts/CartContext';
import { SalesProvider } from './contexts/SalesContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { ReturnProvider } from './contexts/ReturnContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FeatureGuard from './components/ui/FeatureGuard';
import DisabledFeatureNotice from './components/ui/DisabledFeatureNotice';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Restaurant Pages
import RestaurantRegistrationPage from './pages/restaurant/RestaurantRegistrationPage';

// Dashboard Pages
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';
import SalespersonDashboard from './pages/dashboards/SalespersonDashboard';

// Super Admin Pages
import SuperAdminUsersPage from './pages/superadmin/UsersPage';
import SuperAdminOrdersPage from './pages/superadmin/OrdersPage';
import SuperAdminLocationsPage from './pages/superadmin/LocationsPage';
import SuperAdminCategoryPage from './pages/superadmin/CategoryPage';
import SuperAdminProductPage from './pages/superadmin/ProductPage';
import SuperAdminVendorPage from './pages/superadmin/VendorPage';
import SuperAdminInventoryPage from './pages/superadmin/InventoryPage';
import SuperAdminPurchasePage from './pages/superadmin/PurchasePage';
import SuperAdminReturnsPage from './pages/superadmin/ReturnsPage';
import SuperAdminSalesReportPage from './pages/superadmin/SalesReportPage';
import SuperAdminSettingsPage from './pages/superadmin/SettingsPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import LocationsPage from './pages/admin/LocationsPage';

// Manager Pages
import ManagerOrdersPage from './pages/manager/OrdersPage';
import ManagerUsersPage from './pages/manager/UsersPage';

// Inventory Pages
import CategoryPage from './pages/inventory/CategoryPage';
import ProductPage from './pages/inventory/ProductPage';
import VendorPage from './pages/inventory/VendorPage';
import InventoryPage from './pages/inventory/InventoryPage';
import PurchasePage from './pages/inventory/PurchasePage';
import ReturnsPage from './pages/inventory/ReturnsPage';

// POS Pages
import POSPage from './pages/pos/POSPage';
import OrdersPage from './pages/pos/OrdersPage';
import ProductCatalogPage from './pages/pos/ProductCatalogPage';
import SalesReturnsPage from './pages/pos/ReturnsPage';

// Report Pages
import SalesReportPage from './pages/reports/SalesReportPage';

// Other Pages
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <FranchiseProvider>
        <RestaurantProvider>
          <TableProvider>
            <OrderProvider>
              <LocationProvider>
                <CategoryProvider>
                  <VendorProvider>
                    <ProductProvider>
                      <StockProvider>
                        <CartProvider>
                          <SalesProvider>
                            <PurchaseProvider>
                              <ReturnProvider>
                                <Router>
                            <Routes>
                              {/* Auth Routes */}
                              <Route path="/login" element={<LoginPage />} />
                              <Route path="/register-restaurant" element={<RestaurantRegistrationPage />} />
                              <Route 
                                path="/register" 
                                element={
                                  <FeatureGuard 
                                    feature="users.userRegistration"
                                    fallback={<Navigate to="/login" replace />}
                                  >
                                    <RegisterPage />
                                  </FeatureGuard>
                                } 
                              />
                              
                              {/* Super Admin Routes */}
                              <Route 
                                path="/superadmin" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminDashboard />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/locations" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminLocationsPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/categories" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminCategoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/products" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminProductPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/vendors" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <FeatureGuard 
                                      feature="inventory.vendorManagement"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Vendor Management"
                                          reason="Vendor management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SuperAdminVendorPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/inventory" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminInventoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/purchase" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <FeatureGuard 
                                      feature="inventory.purchaseTracking"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Purchase Tracking"
                                          reason="Purchase tracking is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SuperAdminPurchasePage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/orders" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminOrdersPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/returns" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <FeatureGuard 
                                      feature="returns.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Returns Management"
                                          reason="Returns processing is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SuperAdminReturnsPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/users" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <FeatureGuard 
                                      feature="users.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="User Management"
                                          reason="User management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SuperAdminUsersPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/reports" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <FeatureGuard 
                                      feature="reports.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Reports"
                                          reason="Reporting features are disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SuperAdminSalesReportPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/superadmin/settings" 
                                element={
                                  <ProtectedRoute allowedRoles={['superadmin']}>
                                    <SuperAdminSettingsPage />
                                  </ProtectedRoute>
                                } 
                              />

                              {/* Admin Routes */}
                              <Route 
                                path="/admin" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/locations" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <LocationsPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/categories" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <CategoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/products" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <ProductPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/vendors" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <FeatureGuard 
                                      feature="inventory.vendorManagement"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Vendor Management"
                                          reason="Vendor management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <VendorPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/inventory" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <InventoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/purchase" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <FeatureGuard 
                                      feature="inventory.purchaseTracking"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Purchase Tracking"
                                          reason="Purchase tracking is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <PurchasePage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/orders" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminOrdersPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/returns" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <FeatureGuard 
                                      feature="returns.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Returns Management"
                                          reason="Returns processing is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <ReturnsPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/users" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <FeatureGuard 
                                      feature="users.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="User Management"
                                          reason="User management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <UsersPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/admin/reports" 
                                element={
                                  <ProtectedRoute allowedRoles={['admin']}>
                                    <FeatureGuard 
                                      feature="reports.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Reports"
                                          reason="Reporting features are disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SalesReportPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />

                              {/* Manager Routes */}
                              <Route 
                                path="/manager" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <ManagerDashboard />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/categories" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <CategoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/products" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <ProductPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/vendors" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <FeatureGuard 
                                      feature="inventory.vendorManagement"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Vendor Management"
                                          reason="Vendor management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <VendorPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/inventory" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <InventoryPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/purchase" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <FeatureGuard 
                                      feature="inventory.purchaseTracking"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Purchase Tracking"
                                          reason="Purchase tracking is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <PurchasePage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/orders" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <ManagerOrdersPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/returns" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <FeatureGuard 
                                      feature="returns.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Returns Management"
                                          reason="Returns processing is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <ReturnsPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/users" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <FeatureGuard 
                                      feature="users.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="User Management"
                                          reason="User management is disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <ManagerUsersPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/manager/reports" 
                                element={
                                  <ProtectedRoute allowedRoles={['manager']}>
                                    <FeatureGuard 
                                      feature="reports.enabled"
                                      fallback={
                                        <DisabledFeatureNotice 
                                          featureName="Reports"
                                          reason="Reporting features are disabled for this store configuration."
                                        />
                                      }
                                    >
                                      <SalesReportPage />
                                    </FeatureGuard>
                                  </ProtectedRoute>
                                } 
                              />

                              {/* Salesperson Routes */}
                              <Route 
                                path="/sales" 
                                element={
                                  <ProtectedRoute allowedRoles={['salesperson']}>
                                    <Navigate to="/sales/pos" replace />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/sales/pos" 
                                element={
                                  <ProtectedRoute allowedRoles={['salesperson']}>
                                    <POSPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/sales/catalog" 
                                element={
                                  <ProtectedRoute allowedRoles={['salesperson']}>
                                    <ProductCatalogPage />
                                  </ProtectedRoute>
                                } 
                              />
                              <Route 
                                path="/sales/orders" 
                                element={
                                  <ProtectedRoute allowedRoles={['salesperson']}>
                                    <OrdersPage />
                                  </ProtectedRoute>
                                } 
                              />
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
                              
                              {/* Default redirect */}
                              <Route path="/" element={<Navigate to="/login" replace />} />
                              
                              {/* 404 */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Router>
                        </ReturnProvider>
                      </PurchaseProvider>
                    </SalesProvider>
                  </CartProvider>
                </StockProvider>
              </ProductProvider>
            </VendorProvider>
          </CategoryProvider>
        </LocationProvider>
      </OrderProvider>
    </TableProvider>
  </RestaurantProvider>
</FranchiseProvider>
</AuthProvider>
  );
}

export default App;