import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrderCountProvider } from './contexts/OrderCountContext';
import { FranchiseProvider } from './contexts/FranchiseContext';
import { LocationProvider } from './contexts/LocationContext';
import { RestaurantProvider } from './contexts/RestaurantContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FeatureGuard from './components/ui/FeatureGuard';
import DisabledFeatureNotice from './components/ui/DisabledFeatureNotice';
import SetupTrigger from './components/SetupTrigger';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SuperAdminRegistrationPage from './pages/auth/SuperAdminRegistrationPage';

// Restaurant Pages
import RestaurantRegistrationPage from './pages/restaurant/RestaurantRegistrationPage';

// Dashboard Pages
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import FranchiseDashboard from './pages/dashboards/FranchiseOwnerDashboard';

// Staff Pages
import StaffTablesPage from './pages/staff/TablesPage';
import StaffCatalogPage from './pages/staff/CatalogPage';
import StaffOrdersPage from './pages/staff/OrdersPage';
import EnhancedStaffPendingOrdersPage from './pages/staff/EnhancedPendingOrdersPage';

// Debug Pages
import DebugStaffOrdersPage from './pages/debug/DebugStaffOrdersPage';

// Full providers for authenticated routes
import FullAppProviders from './components/providers/FullAppProviders';

// Super Admin Pages
import SuperAdminUsersPage from './pages/superadmin/UsersPage';
import SuperAdminOrdersPage from './pages/superadmin/OrdersPage';
import FranchisesPage from './pages/superadmin/FranchisesPage';
import LocationsPage from './pages/superadmin/LocationsPage';
import SuperAdminSalesReportPage from './pages/superadmin/SalesReportPage';
import SuperAdminSettingsPage from './pages/superadmin/SettingsPage';
import AdvancedAnalyticsPage from './pages/superadmin/AdvancedAnalyticsPage';
import GlobalAnalyticsPage from './pages/superadmin/GlobalAnalyticsPage';
import SuperAdminSystemSettingsPage from './pages/superadmin/SystemSettingsPage';

// Admin Pages
import UsersPage from './pages/admin/UsersPage';
import AdminOrdersPage from './pages/admin/OrdersPage';
import AdminLocationsPage from './pages/admin/LocationsPage';
import AdminSettingsPage from './pages/admin/SettingsPage';
import MenuPage from './pages/admin/MenuPage';
import EnhancedAdminOrdersPage from './pages/admin/EnhancedOrdersPage';

// Franchise Pages
import FranchiseUsersPage from './pages/franchise/UsersPage';
import FranchiseLocationsPage from './pages/franchise/LocationsPage';
import FranchiseSettingsPage from './pages/franchise/FranchiseSettingsPage';

// Manager Pages
import OrdersPage from './pages/manager/OrdersPage';
import ManagerUsersPage from './pages/manager/UsersPage';
import ManagerSettingsPage from './pages/manager/SettingsPage';
import ManagerMenuPage from './pages/manager/MenuPage';
import ManagerTablesPage from './pages/manager/TablesPage';
import ManagerCatalogPage from './pages/manager/CatalogPage';
import ManagerPendingOrdersPage from './pages/manager/ManagerPendingOrdersPage';

// Reports Pages - Main sales report component
import SalesReportPage from './pages/reports/SalesReportPage';

// Inventory Pages
import CategoryPage from './pages/inventory/CategoryPage';
import ProductPage from './pages/inventory/ProductPage';
import InventoryPage from './pages/inventory/InventoryPage';
import PurchasePage from './pages/inventory/PurchasePage';
import ReturnsPage from './pages/inventory/ReturnsPage';

// POS Pages
import POSPage from './pages/pos/POSPage';
import POSOrdersPage from './pages/pos/OrdersPage';
import ProductCatalogPage from './pages/pos/ProductCatalogPage';
import SalesReturnsPage from './pages/pos/ReturnsPage';

// Other Pages
import NotFound from './pages/NotFound';

// Order Pages
import TableSelectionPage from './pages/order/TableSelectionPage';

// Userbase Page
import UserbasePage from './pages/userbase/UserbasePage';

// Print Page
import PrintReceiptPage from './pages/print/PrintReceiptPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OrderCountProvider>
          <Router>
          <Routes>
            {/* Auth Routes - Minimal Providers Only */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-superadmin" element={<SuperAdminRegistrationPage />} />
            <Route path="/register-restaurant" element={
              <RestaurantProvider>
                <RestaurantRegistrationPage />
              </RestaurantProvider>
            } />
            <Route 
              path="/register" 
              element={
                <FeatureGuard 
                  feature="users.userRegistration"
                  fallback={<Navigate to="/login" replace />}
                >
                  <FranchiseProvider>
                    <LocationProvider>
                      <RegisterPage />
                    </LocationProvider>
                  </FranchiseProvider>
                </FeatureGuard>
              } 
            />
            
            {/* All authenticated routes need full providers */}
            <Route path="/*" element={
              <FranchiseProvider>
                <LocationProvider>
                  <FullAppProviders>
                    <Routes>
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
                        path="/superadmin/franchises" 
                        element={
                          <ProtectedRoute allowedRoles={['superadmin']}>
                            <FranchisesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/superadmin/locations" 
                        element={
                          <ProtectedRoute allowedRoles={['superadmin']}>
                            <LocationsPage />
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
                      <Route 
                        path="/superadmin/analytics" 
                        element={
                          <ProtectedRoute allowedRoles={['superadmin']}>
                            <AdvancedAnalyticsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/superadmin/global-analytics" 
                        element={
                          <ProtectedRoute allowedRoles={['superadmin']}>
                            <GlobalAnalyticsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/superadmin/system-settings" 
                        element={
                          <ProtectedRoute allowedRoles={['superadmin']}>
                            <SuperAdminSystemSettingsPage />
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
                            <AdminLocationsPage />
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
                        path="/admin/menu" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <MenuPage />
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
                        path="/admin/enhanced-orders" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <EnhancedAdminOrdersPage />
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
                      <Route 
                        path="/admin/settings" 
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminSettingsPage />
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
                        path="/manager/orders" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <OrdersPage />
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
                        path="/manager/settings" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerSettingsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/manager/menu" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerMenuPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/manager/pos" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <POSPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/manager/tables" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerTablesPage />
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
                        path="/manager/catalog" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerCatalogPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/manager/pending-orders" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <ManagerPendingOrdersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/manager/reports" 
                        element={
                          <ProtectedRoute allowedRoles={['manager']}>
                            <SalesReportPage />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Userbase Route - Shared by Manager, Admin, and Super Admin */}
                      <Route 
                        path="/userbase" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'admin', 'owner', 'superadmin']}>
                            <UserbasePage />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Staff Routes */}
                      <Route 
                        path="/staff" 
                        element={
                          <ProtectedRoute allowedRoles={['staff']}>
                            <StaffDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff/tables" 
                        element={
                          <ProtectedRoute allowedRoles={['staff']}>
                            <StaffTablesPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff/catalog" 
                        element={
                          <ProtectedRoute allowedRoles={['staff']}>
                            <StaffCatalogPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff/orders" 
                        element={
                          <ProtectedRoute allowedRoles={['staff']}>
                            <StaffOrdersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/staff/pending-orders" 
                        element={
                          <ProtectedRoute allowedRoles={['staff']}>
                            <EnhancedStaffPendingOrdersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/debug-staff-orders" 
                        element={
                          <ProtectedRoute allowedRoles={['staff', 'manager', 'admin']}>
                            <DebugStaffOrdersPage />
                          </ProtectedRoute>
                        } 
                      />

                      {/* POS Routes */}
                      <Route 
                        path="/pos" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'staff']}>
                            <POSPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pos/orders" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'staff']}>
                            <POSOrdersPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pos/catalog" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'staff']}>
                            <ProductCatalogPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/pos/returns" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'staff']}>
                            <FeatureGuard 
                              feature="returns.enabled"
                              fallback={
                                <DisabledFeatureNotice 
                                  featureName="Returns Management"
                                  reason="Returns processing is disabled for this store configuration."
                                />
                              }
                            >
                              <SalesReturnsPage />
                            </FeatureGuard>
                          </ProtectedRoute>
                        } 
                      />

                      {/* Table Selection Route */}
                      <Route 
                        path="/select-table" 
                        element={
                          <ProtectedRoute allowedRoles={['manager', 'staff']}>
                            <TableSelectionPage />
                          </ProtectedRoute>
                        } 
                      />

                      {/* Franchise Routes */}
                      <Route 
                        path="/franchise" 
                        element={
                          <ProtectedRoute allowedRoles={['owner']}>
                            <FranchiseDashboard />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/franchise/users" 
                        element={
                          <ProtectedRoute allowedRoles={['owner']}>
                            <FeatureGuard 
                              feature="users.enabled"
                              fallback={
                                <DisabledFeatureNotice 
                                  featureName="User Management"
                                  reason="User management is disabled for this store configuration."
                                />
                              }
                            >
                              <FranchiseUsersPage />
                            </FeatureGuard>
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/franchise/locations" 
                        element={
                          <ProtectedRoute allowedRoles={['owner']}>
                            <FranchiseLocationsPage />
                          </ProtectedRoute>
                        } 
                      />
                      <Route 
                        path="/franchise/settings" 
                        element={
                          <ProtectedRoute allowedRoles={['owner']}>
                            <FranchiseSettingsPage />
                          </ProtectedRoute>
                        } 
                      />

  
                      {/* Print Receipt Route - Public for silent printing */}
                      <Route path="/print-receipt" element={<PrintReceiptPage />} />

                      {/* Default redirect */}
                      <Route path="/" element={<Navigate to="/login" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <SetupTrigger />
                  </FullAppProviders>
                </LocationProvider>
              </FranchiseProvider>
            } />
          </Routes>
        </Router>
        </OrderCountProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;