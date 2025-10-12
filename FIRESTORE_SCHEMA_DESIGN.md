# Firestore Schema Design for Multi-Franchise Restaurant POS

## 🏗️ **Current Analysis**

### Existing Structure
- **Franchises**: Main restaurant business entity
- **Locations**: Individual stores under each franchise
- **Users**: Staff, managers, admins with role-based access
- **Orders**: Basic order structure (needs enhancement)
- **Tables**: Table management with status tracking

### Issues Identified
1. **No proper order flow**: Missing partial orders → manager pending → completed orders
2. **No real-time table status**: Tables not updating across devices
3. **Limited offline support**: Basic offline actions but incomplete
4. **No role-based order visibility**: All orders visible to all users

## 🎯 **Proposed Firestore Schema**

### 1. **Franchises Collection** (`franchises`)
```javascript
{
  id: string,
  name: string, // "Na Potta Na Istam"
  businessName: string,
  ownerName: string,
  email: string,
  phone: string,
  address: string,
  gstNumber: string,
  isActive: boolean,
  isApproved: boolean,
  plan: 'basic' | 'premium' | 'enterprise',
  subscriptionStatus: 'active' | 'inactive',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. **Locations Collection** (`locations`)
```javascript
{
  id: string,
  name: string, // "ramachandrapuram"
  storeName: string, // "Na Potta Na Istam - Main Store"
  address: string,
  phone: string,
  email: string,
  franchiseId: string, // Links to franchise
  isActive: boolean,
  isApproved: boolean,
  settings: {
    maxTables: number,
    taxRates: {
      cgst: number,
      sgst: number
    }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3. **Users Collection** (`users`)
```javascript
{
  id: string,
  email: string,
  displayName: string,
  role: 'superadmin' | 'admin' | 'owner' | 'manager' | 'staff',
  franchiseId: string, // Which franchise they belong to
  locationId: string, // Primary location (for staff)
  locationIds: string[], // All accessible locations (for admin/manager)
  isActive: boolean,
  isApproved: boolean,
  permissions: string[],
  createdAt: Timestamp,
  lastLogin: Timestamp
}
```

### 4. **Tables Collection** (`tables`)
```javascript
{
  id: string,
  name: string, // "Table 1", "Table 2"
  locationId: string,
  capacity: number,
  status: 'available' | 'occupied' | 'reserved' | 'maintenance',
  currentOrderId: string, // ID of ongoing order
  occupiedAt: Timestamp,
  reservedBy: string, // Staff ID
  reservedAt: Timestamp,
  reservationExpiryAt: Timestamp,
  mergedWith: string[], // For table merging
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 5. **Orders Collection** (`orders`) - **Main Order Structure**
```javascript
{
  id: string,
  orderNumber: string, // "ORD-241011-001"
  locationId: string,
  franchiseId: string, // Denormalized for easy filtering
  tableIds: string[], // Support multiple tables
  staffId: string, // Who created the order
  orderType: 'dinein' | 'delivery',
  orderMode: 'zomato' | 'swiggy' | 'in-store', // For delivery
  
  // Order Status Flow
  status: 'temporary' | 'ongoing' | 'transferred' | 'settled' | 'completed',
  
  // Items and Pricing
  items: [
    {
      id: string,
      menuItemId: string,
      name: string,
      price: number,
      quantity: number,
      modifications: string[],
      notes: string,
      addedAt: Timestamp
    }
  ],
  subtotal: number,
  gstAmount: number,
  totalAmount: number,
  
  // Customer Information
  customerName: string,
  customerPhone: string,
  deliveryAddress: string,
  
  // Payment Information
  paymentMethod: 'cash' | 'card' | 'upi',
  paymentStatus: 'pending' | 'partial' | 'paid',
  settledAt: Timestamp,
  
  // Transfer Information
  transferredAt: Timestamp,
  transferredBy: string, // Staff ID who transferred
  
  // Session Tracking
  sessionStartedAt: Timestamp,
  sessionDuration: number, // Duration in minutes
  
  // Metadata
  notes: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 6. **Temporary Orders Collection** (`temporary_orders`) - **Staff Active Orders**
```javascript
{
  id: string,
  orderId: string, // Links to main order
  locationId: string,
  staffId: string, // Which staff is handling this
  tableIds: string[],
  status: 'temporary' | 'ongoing', // Staff-side status only
  
  // Session Management
  sessionStartedAt: Timestamp,
  lastActivityAt: Timestamp,
  
  // Local Storage Key (for offline support)
  localStorageKey: string, // "temp_order_${orderId}"
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 7. **Manager Pending Orders Collection** (`manager_pending_orders`) - **Manager Queue**
```javascript
{
  id: string,
  orderId: string, // Links to main order
  locationId: string,
  franchiseId: string,
  transferredBy: string, // Staff ID
  transferredAt: Timestamp,
  
  // Priority and Assignment
  priority: 'normal' | 'high' | 'urgent',
  assignedTo: string, // Manager ID (if assigned)
  
  // Status Tracking
  status: 'pending' | 'assigned' | 'in_progress' | 'ready_for_settlement',
  
  // Notes from Staff
  transferNotes: string,
  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 8. **Order History Collection** (`order_history`) - **Audit Trail**
```javascript
{
  id: string,
  orderId: string,
  locationId: string,
  action: 'created' | 'updated' | 'transferred' | 'settled' | 'completed',
  performedBy: string, // User ID
  previousStatus: string,
  newStatus: string,
  changes: object, // What changed
  notes: string,
  timestamp: Timestamp
}
```

## 🔄 **Order Flow Implementation**

### **Staff Flow**
1. **Start Order** → Create in `orders` with status `temporary`
2. **Add Items** → Update order items, status becomes `ongoing`
3. **Go for Bill** → Create entry in `manager_pending_orders`, update order status to `transferred`
4. **Order disappears from staff dashboard**

### **Manager Flow**
1. **View Pending** → Read from `manager_pending_orders`
2. **Accept Order** → Update manager pending status to `assigned`
3. **Modify/Settle** → Update order, add payment info
4. **Complete Order** → Update order status to `settled` → `completed`

### **Real-time Updates**
- **Table Status**: Use `onSnapshot` on `tables` collection
- **Order Updates**: Use `onSnapshot` on `orders` collection with location filter
- **Manager Queue**: Use `onSnapshot` on `manager_pending_orders`

## 🔐 **Role-Based Access Control**

### **Superadmin**
- Can see all franchises, locations, orders
- Full access to all data

### **Admin/Owner**
- Can see all locations in their franchise
- Can see all orders in their franchise locations
- Can manage users, tables, menu

### **Manager**
- Can see all locations assigned to them
- Can see all orders in their locations
- Can settle bills, manage staff

### **Staff**
- Can only see their assigned location
- Can only see their own temporary orders
- Cannot see other staff orders or settled orders

## 📱 **Offline Support Strategy**

### **Local Storage Structure**
```javascript
{
  // Active temporary orders
  temp_orders: {
    "temp_order_${orderId}": { ...orderData }
  },
  
  // Offline actions queue
  offline_actions: [
    {
      id: string,
      type: 'create_order' | 'update_order' | 'transfer_order',
      data: object,
      timestamp: number,
      synced: boolean
    }
  ],
  
  // Table status cache
  table_cache: {
    "${tableId}": { ...tableData }
  },
  
  // Last sync timestamp
  last_sync: number
}
```

### **Sync Strategy**
1. **Auto-sync** when online
2. **Conflict resolution** using timestamps
3. **Queue management** for failed actions
4. **Background sync** every 30 seconds

## 🎯 **Implementation Priority**

1. **Phase 1**: Core order flow (temporary → transferred → settled)
2. **Phase 2**: Real-time table status updates
3. **Phase 3**: Role-based access control
4. **Phase 4**: Offline support enhancement
5. **Phase 5**: Advanced features (order history, reporting)

---

**Next Steps**: Implement the core order flow with proper Firestore collections and real-time updates.