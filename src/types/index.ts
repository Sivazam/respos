// Restaurant-specific user roles
export type UserRole = 'superadmin' | 'admin' | 'owner' | 'manager' | 'staff';

// Legacy roles for backward compatibility during migration
export type LegacyUserRole = 'salesperson' | 'restaurantowner' | 'franchise_manager' | 'franchise_staff' | 'super_admin';

export interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: UserRole;
  permissions: string[]; // Granular permissions array
  isActive: boolean;
  isApproved: boolean;
  franchiseId?: string; // Links to specific franchise (restaurant)
  locationId?: string; // For multi-location restaurants (specific store)
  locationIds?: string[]; // For admin/owner roles - array of all accessible locations
  requestedLocationId?: string; // For pending approval - location they requested
  phone?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  createdAt: Date;
  lastLogin: Date;
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, locationId?: string) => Promise<void>;
  register: (email: string, password: string, role: UserRole, franchiseId?: string, locationId?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// Restaurant Management
export interface Restaurant {
  id: string;
  name: string;
  businessName?: string;
  address: string;
  contactInfo: {
    phone?: string;
    email?: string;
    gstNumber?: string;
  };
  ownerId: string; // References User with restaurantowner role
  isApproved: boolean;
  isActive: boolean;
  settings: RestaurantSettings;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

export interface RestaurantSettings {
  maxTables?: number;
  maxStaff?: number;
  taxRates: {
    cgst: number;
    sgst: number;
  };
  orderTypes: ('dinein' | 'delivery')[];
  features: {
    tableManagement: boolean;
    onlineOrders: boolean;
    thermalPrinting: boolean;
    offlineMode: boolean;
  };
}

export interface RestaurantFormData {
  name: string;
  businessName?: string;
  address: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
}

// Restaurant Location (Store) - belongs to a Franchise
export interface Location {
  id: string;
  name: string; // Store name/identifier (e.g., "ramachandrapuram")
  storeName: string; // Display name (e.g., "Na Potta Na Istam - Main Store")
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  description?: string;
  gstNumber?: string;
  isActive: boolean;
  franchiseId: string; // Links to Franchise (Restaurant)
  isApproved: boolean; // For multi-location approval
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

export interface LocationFormData {
  name: string;
  storeName: string;
  address: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  isActive?: boolean;
}

// Table Management - Enhanced for new POS system
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface Table {
  id: string;
  name: string; // Changed from number to name for more flexibility
  locationId: string; // Required - every table belongs to a location
  capacity: number;
  status: TableStatus;
  occupiedAt?: Date; // When table was occupied
  reservedBy?: string; // Staff ID who reserved it
  reservedAt?: Date; // When reservation was made
  reservationExpiryAt?: Date; // When reservation expires (2 hours)
  reservationDetails?: {
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  };
  currentOrderId?: string; // For ongoing orders
  mergedWith?: string[]; // Array of table IDs if merged
  createdAt: Date;
  updatedAt: Date;
}

export interface TableFormData {
  name: string;
  capacity: number;
  status?: TableStatus;
}

export interface TableReservationData {
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}

// Menu Categories (Restaurant-specific)
export interface Category {
  id: string;
  name: string;
  description?: string;
  restaurantId: string;
  locationId?: string; // For location-specific categories
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Restaurant Menu Item (replaces Product)
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra_hot';
  restaurantId: string;
  locationId?: string; // For location-specific pricing/availability
  hasHalfPortion?: boolean; // New field for portion variant
  halfPortionCost?: number; // New field for half portion cost
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItemFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isVegetarian: boolean;
  isAvailable: boolean;
  preparationTime: number;
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra_hot';
  hasHalfPortion?: boolean; // New field for portion variant
  halfPortionCost?: number; // New field for half portion cost
}

// Legacy Product interface for backward compatibility
export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  quantity: number;
  imageUrl?: string;
  locationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFormData {
  name: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
}



export interface StockUpdate {
  id: string;
  productId: string;
  quantity: number;
  invoiceNumber?: string;
  notes?: string;
  locationId?: string;
  createdAt: Date;
}

export interface StockUpdateFormData {
  productId: string;
  quantity: number;
  invoiceNumber?: string;
  notes?: string;
  type: 'add' | 'reduce';
}

// Customer Data Collection
export interface Customer {
  name?: string;
  phone?: string;
  city?: string;
  collectedBy?: 'staff' | 'manager';
  collectedAt?: number;
}

export interface CustomerData {
  id?: string;
  orderId?: string;
  name?: string;
  phone?: string;
  city?: string;
  timestamp: number;
  source?: 'staff' | 'manager';
}

// Order Management - Enhanced for new POS system
export interface Order {
  id: string;
  locationId: string; // Required - every order belongs to a location
  tableIds: string[]; // Support multiple tables for large groups
  tableNames: string[]; // Human-readable table names
  staffId: string; // Staff who created the order
  staffName: string; // Staff display name
  orderType: 'dinein' | 'delivery'; // Changed takeaway to delivery
  orderNumber: string; // Sequential order number per location
  items: OrderItem[];
  status: 'temporary' | 'ongoing' | 'transferred' | 'settled'; // Complete order status flow
  totalAmount: number;
  subtotal: number;
  tax: number;
  gstAmount: number;
  total: number;
  discount: { type: 'percentage' | 'fixed'; amount: number };
  isFinalOrder: boolean; // true = final order after "Go for Bill", false = temporary orders
  paymentMethod?: 'cash' | 'card' | 'upi'; // Only for settled orders
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  settledAt?: Date; // When payment was settled
  notes?: string;
  customerName?: string; // For delivery orders
  customerPhone?: string; // For delivery orders
  deliveryAddress?: string; // For delivery orders
  orderMode?: 'zomato' | 'swiggy' | 'in-store'; // For delivery orders
  specialInstructions?: string;
  estimatedTime?: Date;
  completedAt?: Date;
  statusHistory: Array<{
    status: string;
    timestamp: any;
    updatedBy: string;
    note?: string;
  }>;
  customer?: Customer; // Optional customer info collected during billing
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifications?: string[];
  notes?: string;
  portionSize?: 'half' | 'full'; // New field for portion size
  addedAt: Date; // When item was added to track order timing
}

export interface OrderFormData {
  tableIds: string[];
  orderType: 'dinein' | 'delivery';
  orderMode?: 'zomato' | 'swiggy' | 'in-store';
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  notes?: string;
}

// Temporary Order for active sessions
export interface TemporaryOrder extends Order {
  isFinalOrder: false; // Always false for temporary orders
  sessionStartedAt: Date; // When first item was added
  status: 'temporary' | 'ongoing' | 'transferred'; // Added 'transferred' status
  transferredAt?: Date; // When order was transferred to manager
  transferredBy?: string; // Staff ID who transferred the order
}

// Final Order after "Go for Bill"
export interface FinalOrder extends Order {
  isFinalOrder: true; // Always true for final orders
  sessionDuration: number; // Duration in minutes from first item to bill
}

// Cart Item for active orders
export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  modifications?: string[];
  notes?: string;
  portionSize?: 'half' | 'full'; // New field for portion size
}

// Staff Performance Tracking
export interface StaffPerformance {
  staffId: string;
  staffName: string;
  locationId: string;
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  ordersToday: number;
  amountToday: number;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Table Order History
export interface TableOrderHistory {
  tableId: string;
  tableName: string;
  locationId: string;
  orders: {
    orderId: string;
    orderNumber: string;
    staffId: string;
    staffName: string;
    totalAmount: number;
    orderType: 'dinein' | 'delivery';
    createdAt: Date;
    duration: number; // Time occupied in minutes
  }[];
  totalOccupiedTime: number; // Total time occupied in minutes
  totalRevenue: number;
  totalOrders: number;
  lastUpdated: Date;
}

// Offline Support
export interface OfflineOrder {
  id: string;
  locationId: string;
  tableIds: string[];
  staffId: string;
  orderType: 'dinein' | 'delivery';
  items: OrderItem[];
  totalAmount: number;
  subtotal: number;
  gstAmount: number;
  isFinalOrder: boolean;
  createdAt: Date;
  isSynced: boolean;
  syncedAt?: Date;
}

export interface OfflineTableAction {
  id: string;
  tableId: string;
  action: 'reserve' | 'occupy' | 'release' | 'create' | 'update' | 'delete';
  data: any;
  staffId: string;
  createdAt: Date;
  isSynced: boolean;
  syncedAt?: Date;
}

export interface OfflineStorage {
  orders: OfflineOrder[];
  tableActions: OfflineTableAction[];
  lastSyncAt: Date;
  locationId: string;
  staffId: string;
}

// Legacy Sale interface for backward compatibility
export interface Sale {
  id: string;
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  locationId?: string;
  createdAt: Date;
  createdBy: string;
}

// Restaurant Receipt/Billing
export interface Receipt {
  order?: Order;
  sale?: Sale; // Legacy support
  businessName: string;
  businessAddress: string;
  gstNumber: string;
  contactNumber: string;
  email: string;
  tableNumber?: string;
  orderType?: 'dinein' | 'delivery';
  customerName?: string;
}

// Billing System
export interface Bill {
  id: string;
  orderId: string;
  tableId?: string;
  items: BillItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  serviceCharge?: number;
  discount?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod[];
  splitBills?: SplitBill[];
  createdAt: Date;
  createdBy: string;
}

export interface BillItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';

export interface SplitBill {
  id: string;
  items: BillItem[];
  subtotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
}

// Thermal Printer Configuration
export interface PrinterConfig {
  id: string;
  name: string;
  type: 'bluetooth' | 'wifi' | 'usb';
  address: string;
  paperSize: '58mm' | '80mm';
  location: 'counter' | 'kitchen' | 'bar';
  templateType: 'receipt' | 'kot' | 'bill';
  isActive: boolean;
  restaurantId: string;
  locationId?: string;
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  invoiceNumber?: string;
  notes?: string;
  locationId?: string;
  createdAt: Date;
  createdBy?: string;
}

export interface PurchaseFormData {
  productId: string;
  quantity: number;
  costPrice: number;
  invoiceNumber?: string;
  notes?: string;
}

export type ReturnType = 'sale' | 'purchase';

export interface Return {
  id: string;
  type: ReturnType;
  referenceId: string;
  items: ReturnItem[];
  reason: string;
  total: number;
  locationId?: string;
  createdAt: Date;
  createdBy?: string;
  refundMethod?: Sale['paymentMethod'];
  status?: 'pending' | 'completed' | 'cancelled';
}

export interface ReturnItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ReturnFormData {
  type: ReturnType;
  referenceId: string;
  items: ReturnItem[];
  reason: string;
  refundMethod?: Sale['paymentMethod'];
  total?: number; // Optional total override
}

// Restaurant Plan & Features (replaces Franchise)
export type RestaurantPlan = 'basic' | 'premium' | 'enterprise';

export interface RestaurantFeatures {
  tableManagement: boolean;
  multiLocation: boolean;
  thermalPrinting: boolean;
  offlineMode: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  kdsIntegration: boolean;
}

export interface RestaurantSubscription {
  id: string;
  restaurantId: string;
  plan: RestaurantPlan;
  status: 'active' | 'inactive' | 'cancelled' | 'suspended';
  startDate: Date;
  endDate?: Date;
  monthlyFee?: number;
  features: RestaurantFeatures;
  limits: {
    maxLocations: number;
    maxTables: number;
    maxStaff: number;
    maxMenuItems: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Legacy Franchise interface for backward compatibility during migration
export type FranchisePlan = 'basic' | 'premium' | 'enterprise';

export interface FranchiseStoredFeatures {
  returns: boolean;
  inventory: boolean;
  reports: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
  api?: boolean; // Legacy support
}

// Franchise (Restaurant Business) - Main entity for each restaurant customer
export interface Franchise {
  id: string;
  name: string; // Restaurant name (e.g., "Na Potta Na Istam")
  businessName?: string; // Legal business name
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
  logoUrl?: string; // Firebase Storage URL for franchise logo
  isActive: boolean;
  isApproved: boolean;
  plan?: FranchisePlan;
  subscriptionPlan?: FranchisePlan;
  subscriptionStatus?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  monthlyFee?: number;
  commissionRate?: number;
  features?: FranchiseStoredFeatures;
  settings?: {
    maxUsers?: number;
    maxProducts?: number;
    maxLocations?: number;
    features?: FranchiseStoredFeatures;
  };
  branding?: {
    businessName?: string;
    primaryColor?: string;
    tagline?: string;
    receiptFooter?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

export interface FranchiseFormData {
  name: string;
  businessName?: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  plan?: FranchisePlan;
  commissionRate?: number;
  features?: FranchiseStoredFeatures;
  logoUrl?: string; // Firebase Storage URL for franchise logo
}