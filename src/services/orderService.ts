import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  limit,
  documentId
} from 'firebase/firestore';
import { db } from '../lib/db';
import { Order, OrderItem, TemporaryOrder, OrderFormData, User, Table } from '../types';
import { SetupService } from './setupService';

// Order Service for handling all order operations
export class OrderService {
  private static instance: OrderService;
  
  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  // Get location name by ID
  private async getLocationName(locationId: string): Promise<string> {
    try {
      const locationRef = doc(db, 'locations', locationId);
      const locationDoc = await getDoc(locationRef);
      
      if (locationDoc.exists()) {
        const locationData = locationDoc.data();
        return locationData.name || locationData.displayName || 'Unknown Location';
      }
      
      return 'Unknown Location';
    } catch (error) {
      console.error('Error fetching location name:', error);
      return 'Unknown Location';
    }
  }

  // Calculate GST using location settings
  private async calculateGST(subtotal: number, locationId: string): Promise<{ cgstAmount: number; sgstAmount: number; totalGstAmount: number }> {
    try {
      const result = await SetupService.getLocationSettings(locationId);
      if (result.success && result.settings && result.settings.tax) {
        const cgstRate = result.settings.tax.cgst / 100;
        const sgstRate = result.settings.tax.sgst / 100;
        const cgstAmount = subtotal * cgstRate;
        const sgstAmount = subtotal * sgstRate;
        const totalGstAmount = cgstAmount + sgstAmount;
        
        return {
          cgstAmount,
          sgstAmount,
          totalGstAmount
        };
      }
      
      // Fallback to 0% total GST if no settings found
      const fallbackAmount = 0;
      return {
        cgstAmount: 0,
        sgstAmount: 0,
        totalGstAmount: 0
      };
    } catch (error) {
      console.error('Error calculating GST:', error);
      // Fallback to 0% total GST
      const fallbackAmount = 0;
      return {
        cgstAmount: 0,
        sgstAmount: 0,
        totalGstAmount: 0
      };
    }
  }

  // Get location GST settings
  async getLocationGSTSettings(locationId: string): Promise<{ cgst: number; sgst: number }> {
    try {
      const result = await SetupService.getLocationSettings(locationId);
      if (result.success && result.settings && result.settings.tax) {
        return {
          cgst: result.settings.tax.cgst || 0,
          sgst: result.settings.tax.sgst || 0
        };
      }
      // Default values if no settings found
      return { cgst: 0, sgst: 0 }; // 0% GST default
    } catch (error) {
      console.error('Error getting location GST settings:', error);
      return { cgst: 0, sgst: 0 }; // Default fallback
    }
  }

  // Calculate GST using location settings
  async calculateOrderGST(subtotal: number, locationId: string): Promise<{ cgstAmount: number; sgstAmount: number; totalGST: number }> {
    const { cgst, sgst } = await this.getLocationGSTSettings(locationId);
    const cgstAmount = subtotal * (cgst / 100);
    const sgstAmount = subtotal * (sgst / 100);
    const totalGST = cgstAmount + sgstAmount;
    
    return {
      cgstAmount,
      sgstAmount,
      totalGST
    };
  }

  // Generate sequential order number for location
  async generateOrderNumber(locationId: string): Promise<string> {
    try {
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(-2) + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
      
      // Query existing orders for today to get next sequence
      const ordersQuery = query(
        collection(db, 'orders'),
        where('locationId', '==', locationId)
      );
      
      const snapshot = await getDocs(ordersQuery);
      let sequence = 1;
      
      if (!snapshot.empty) {
        // Filter and sort client-side
        const todayOrders = snapshot.docs
          .map(doc => doc.data().orderNumber)
          .filter(orderNumber => orderNumber && orderNumber.startsWith(`ORD-${dateStr}`))
          .sort((a, b) => b.localeCompare(a)); // Sort descending
        
        if (todayOrders.length > 0) {
          const lastOrderNumber = todayOrders[0];
          const lastSequence = parseInt(lastOrderNumber.split('-')[2]);
          sequence = lastSequence + 1;
        }
      }
      
      return `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating order number:', error);
      // Fallback to timestamp-based number
      return `ORD-${Date.now()}`;
    }
  }

  // Create new temporary order (Staff initiates order)
  async createTemporaryOrder(
    orderData: OrderFormData,
    staff: User,
    locationId: string,
    franchiseId: string
  ): Promise<string> {
    try {
      const orderNumber = await this.generateOrderNumber(locationId);
      
      // Fetch table names if not provided
      let tableNames = orderData.tableNames || [];
      if ((!tableNames || tableNames.length === 0) && orderData.tableIds && orderData.tableIds.length > 0) {
        try {
          // Fetch table documents to get their names
          const tablePromises = orderData.tableIds.map((tableId: string) => 
            getDoc(doc(db, 'tables', tableId))
          );
          const tableDocs = await Promise.all(tablePromises);
          
          tableNames = tableDocs.map(tableDoc => {
            if (tableDoc.exists()) {
              return `Table ${tableDoc.data().name}`;
            }
            return tableId; // Fallback to ID if table not found
          });
        } catch (error) {
          console.error('Error fetching table names:', error);
          // Fallback to table IDs
          tableNames = orderData.tableIds;
        }
      }
      
      // Create main order document - filter out undefined fields
      const orderDoc: Record<string, any> = {
        orderNumber,
        locationId,
        franchiseId,
        tableIds: orderData.tableIds,
        tableNames, // Use the fetched table names
        staffId: staff.uid,
        orderType: orderData.orderType || 'dinein',
        status: 'temporary',
        items: orderData.items || [],
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        sessionStartedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only include fields that are not undefined
      if (orderData.orderMode !== undefined) {
        orderDoc.orderMode = orderData.orderMode;
      }
      if (orderData.customerName !== undefined) {
        orderDoc.customerName = orderData.customerName;
      }
      if (orderData.customerPhone !== undefined) {
        orderDoc.customerPhone = orderData.customerPhone;
      }
      if (orderData.deliveryAddress !== undefined) {
        orderDoc.deliveryAddress = orderData.deliveryAddress;
      }
      if (orderData.notes !== undefined) {
        orderDoc.notes = orderData.notes;
      }

      const orderRef = await addDoc(collection(db, 'orders'), orderDoc);
      const orderId = orderRef.id;

      // Create temporary order record for staff
      const tempOrderDoc = {
        orderId,
        locationId,
        locationName: await this.getLocationName(locationId),
        staffId: staff.uid,
        staffName: staff.name || staff.email || 'Unknown Staff',
        tableIds: orderData.tableIds,
        status: 'temporary',
        sessionStartedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        localStorageKey: `temp_order_${orderId}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'temporary_orders'), tempOrderDoc);

      // Update table status to occupied
      await this.updateTablesStatus(orderData.tableIds, 'occupied', orderId, locationId);

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, locationId, 'created', staff.uid, {
        orderNumber,
        tableIds: orderData.tableIds,
        orderType: orderData.orderType
      });

      console.log('✅ Temporary order created:', orderId);
      return orderId;
    } catch (error) {
      console.error('Error creating temporary order:', error);
      throw error;
    }
  }

  // Update order items and calculate totals
  async updateOrderItems(
    orderId: string,
    items: OrderItem[],
    staffId: string
  ): Promise<void> {
    try {
      // Get order details to find locationId
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data();
      const locationId = orderData.locationId;
      
      // Ensure table names are present
      let tableNames = orderData.tableNames || [];
      if ((!tableNames || tableNames.length === 0) && orderData.tableIds && orderData.tableIds.length > 0) {
        try {
          // Fetch table documents to get their names
          const tablePromises = orderData.tableIds.map((tableId: string) => 
            getDoc(doc(db, 'tables', tableId))
          );
          const tableDocs = await Promise.all(tablePromises);
          
          tableNames = tableDocs.map(tableDoc => {
            if (tableDoc.exists()) {
              return `Table ${tableDoc.data().name}`;
            }
            return tableId; // Fallback to ID if table not found
          });
        } catch (error) {
          console.error('Error fetching table names:', error);
          // Fallback to table IDs
          tableNames = orderData.tableIds;
        }
      }
      
      // Calculate totals with proper GST
      const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      const gstCalculation = await this.calculateOrderGST(subtotal, locationId);
      const totalAmount = subtotal + gstCalculation.totalGST;

      // Update main order
      await updateDoc(orderRef, {
        items,
        tableNames, // Ensure table names are updated if they were missing
        subtotal,
        cgstAmount: gstCalculation.cgstAmount,
        sgstAmount: gstCalculation.sgstAmount,
        gstAmount: gstCalculation.totalGST,
        totalAmount,
        status: items.length > 0 ? 'ongoing' : 'temporary',
        updatedAt: serverTimestamp()
      });

      // Update temporary order activity
      await this.updateTemporaryOrderActivity(orderId, staffId);

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, '', 'updated', staffId, {
        itemsCount: items.length,
        totalAmount
      });

      console.log('✅ Order items updated:', orderId);
    } catch (error) {
      console.error('Error updating order items:', error);
      throw error;
    }
  }

  // Transfer order to manager (Staff clicks "Go for Bill")
  async transferOrderToManager(
    orderId: string,
    staffId: string,
    notes?: string,
    customerData?: {
      name?: string;
      phone?: string;
      city?: string;
      paymentMethod?: 'cash' | 'card' | 'upi';
      source: 'staff' | 'manager';
      timestamp: number;
    }
  ): Promise<void> {
    try {
      console.log('🔄 Starting transfer for order:', orderId, 'by staff:', staffId);
      if (customerData) {
        console.log('👤 Customer data provided:', customerData);
      }
      
      // First, get the temporary order from temporary_orders collection
      const tempOrdersQuery = query(
        collection(db, 'temporary_orders'),
        where('orderId', '==', orderId)
      );
      
      const tempSnapshot = await getDocs(tempOrdersQuery);
      
      if (tempSnapshot.empty) {
        throw new Error('Temporary order not found');
      }
      
      const tempOrderData = tempSnapshot.docs[0].data();
      console.log('📋 Found temporary order:', tempOrderData);
      
      // Get staff name from the temporary order
      const staffName = tempOrderData.staffName || 'Unknown Staff';
      
      // Update the order document with customer info if provided
      if (customerData) {
        const orderRef = doc(db, 'orders', orderId);
        const updateData: any = {
          paymentMethod: customerData.paymentMethod,
          pendingPaymentMethod: customerData.paymentMethod,
          updatedAt: serverTimestamp()
        };

        // Only include customerInfo if there's actual customer data
        if (customerData.name || customerData.phone || customerData.city) {
          updateData.customerInfo = {
            name: customerData.name || null,
            phone: customerData.phone || null,
            city: customerData.city || null
          };
        }

        await updateDoc(orderRef, updateData);
        console.log('✅ Updated order document with customer info');
      }
      
      // Create manager pending order entry with the correct structure
      const managerPendingDoc = {
        orderId: orderId,
        createdAt: serverTimestamp(),
        createdBy: staffId, // Using staffId as createdBy for consistency
        createdByName: staffName,
        franchiseId: tempOrderData.franchiseId || '',
        locationId: tempOrderData.locationId,
        locationName: tempOrderData.locationName || 'Unknown Location',
        notes: notes || 'Staff transferred order for billing',
        priority: 'normal',
        status: 'pending',
        updatedAt: serverTimestamp(),
        transferredBy: staffId,
        transferredAt: serverTimestamp()
      };

      console.log('📝 Creating manager pending order:', managerPendingDoc);
      await addDoc(collection(db, 'manager_pending_orders'), managerPendingDoc);

      // Remove from temporary orders
      await this.removeTemporaryOrder(orderId);

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, tempOrderData.locationId, 'transferred', staffId, {
        notes,
        hasCustomerData: !!customerData
      });

      console.log('✅ Order transferred to manager successfully:', orderId);
    } catch (error) {
      console.error('❌ Error transferring order to manager:', error);
      throw error;
    }
  }

  // Complete order (Final step)
  async completeOrder(orderId: string, managerId: string): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, '', 'completed', managerId, {});

      console.log('✅ Order completed:', orderId);
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }

  // Get real-time orders for location
  subscribeToLocationOrders(
    locationId: string,
    callback: (orders: Order[]) => void
  ): () => void {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('locationId', '==', locationId)
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const orderData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          sessionStartedAt: data.sessionStartedAt?.toDate(),
          transferredAt: data.transferredAt?.toDate(),
          settledAt: data.settledAt?.toDate()
        };
        orders.push(orderData as unknown as Order);
      });
      // Sort client-side by createdAt descending
      orders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      callback(orders);
    });
  }

  // Get real-time temporary orders for staff
  subscribeToStaffTemporaryOrders(
    staffId: string,
    locationId: string,
    callback: (orders: TemporaryOrder[]) => void
  ): () => void {
    const tempOrdersQuery = query(
      collection(db, 'temporary_orders'),
      where('staffId', '==', staffId),
      where('locationId', '==', locationId)
    );

    return onSnapshot(tempOrdersQuery, (snapshot) => {
      const tempOrderIds = snapshot.docs.map(doc => doc.data().orderId);
      
      if (tempOrderIds.length === 0) {
        callback([]);
        return;
      }

      // Get full order details - split into multiple queries to avoid 'in' clause limits
      const promises: Promise<any>[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < tempOrderIds.length; i += batchSize) {
        const batch = tempOrderIds.slice(i, i + batchSize);
        const ordersQuery = query(
          collection(db, 'orders'),
          where(documentId(), 'in', batch)
        );
        
        promises.push(
          new Promise((resolve) => {
            const unsubscribe = onSnapshot(ordersQuery, (orderSnapshot) => {
              const orders: TemporaryOrder[] = [];
              orderSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'temporary' || data.status === 'ongoing') {
                  orders.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    sessionStartedAt: data.sessionStartedAt?.toDate()
                  } as TemporaryOrder);
                }
              });
              resolve(orders);
            });
            return unsubscribe;
          })
        );
      }

      // Wait for all batches and combine results
      Promise.all(promises).then((results) => {
        const allOrders = results.flat() as TemporaryOrder[];
        // Sort client-side by createdAt descending
        allOrders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        callback(allOrders);
      });
    });
  }

  // Get real-time manager pending orders
  subscribeToManagerPendingOrders(
    locationId: string,
    callback: (orders: any[]) => void
  ): () => void {
    // Track current orders to avoid unnecessary callbacks
    let currentOrders: any[] = [];

    // Set up Firestore real-time listener
    const pendingQuery = query(
      collection(db, 'manager_pending_orders'),
      where('locationId', '==', locationId)
    );

    const unsubscribe = onSnapshot(pendingQuery, async (snapshot) => {
      const firestoreOrders: any[] = [];
      
      // Sort client-side by transferredAt
      const sortedDocs = snapshot.docs.sort((a, b) => {
        const aTime = a.data().transferredAt?.toMillis() || 0;
        const bTime = b.data().transferredAt?.toMillis() || 0;
        return bTime - aTime; // descending
      });
      
      for (const docSnapshot of sortedDocs) {
        const pendingData = docSnapshot.data();
        
        // Only process pending, assigned, or in_progress orders
        if (['pending', 'assigned', 'in_progress'].includes(pendingData.status)) {
          // Get full order details
          const orderDoc = await getDoc(doc(db, 'orders', pendingData.orderId));
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            firestoreOrders.push({
              id: docSnapshot.id,
              ...pendingData,
              order: {
                id: orderDoc.id,
                ...orderData,
                createdAt: orderData.createdAt?.toDate(),
                transferredAt: orderData.transferredAt?.toDate()
              }
            });
          }
        }
      }
      
      // Only call callback if orders have actually changed
      if (JSON.stringify(firestoreOrders) !== JSON.stringify(currentOrders)) {
        currentOrders = firestoreOrders;
        callback(firestoreOrders);
      }
    });

    // Return cleanup function
    return () => {
      unsubscribe();
    };
  }

  // Helper methods
  async acceptPendingOrder(orderId: string, managerId: string): Promise<void> {
    try {
      // Update the pending order status in Firestore
      const pendingQuery = query(
        collection(db, 'manager_pending_orders'),
        where('orderId', '==', orderId)
      );
      
      const snapshot = await getDocs(pendingQuery);
      
      if (!snapshot.empty) {
        const pendingDoc = snapshot.docs[0];
        await updateDoc(pendingDoc.ref, {
          status: 'assigned',
          assignedTo: managerId,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Updated pending order status in Firestore:', orderId);
      } else {
        console.warn('⚠️ Pending order not found in Firestore:', orderId);
      }
    } catch (error) {
      console.error('Error accepting pending order:', error);
      throw error;
    }
  }

  async settleOrder(orderId: string, paymentData: any): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();

      // Fetch table names if not already present
      let tableNames = orderData.tableNames || [];
      if ((!tableNames || tableNames.length === 0) && orderData.tableIds && orderData.tableIds.length > 0) {
        try {
          // Fetch table documents to get their names
          const tablePromises = orderData.tableIds.map((tableId: string) => 
            getDoc(doc(db, 'tables', tableId))
          );
          const tableDocs = await Promise.all(tablePromises);
          
          tableNames = tableDocs.map(tableDoc => {
            if (tableDoc.exists()) {
              return `Table ${tableDoc.data().name}`;
            }
            return tableId; // Fallback to ID if table not found
          });
        } catch (error) {
          console.error('Error fetching table names:', error);
          // Fallback to table IDs
          tableNames = orderData.tableIds;
        }
      }

      // Calculate proper GST amounts if not already present
      const items = orderData.items || [];
      const subtotal = items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);
      const gstCalculation = await this.calculateOrderGST(subtotal, orderData.locationId);
      const totalWithTax = subtotal + gstCalculation.totalGST;

      // Use pendingPaymentMethod if available, otherwise use provided paymentData
      const paymentMethodToUse = orderData.pendingPaymentMethod || paymentData.paymentMethod || 'cash';

      // Update the order status to completed and save payment data with proper tax amounts
      await updateDoc(orderRef, {
        status: 'completed',
        paymentData: {
          paymentMethod: paymentMethodToUse,
          amount: paymentData.amount || totalWithTax,
          settledAt: paymentData.settledAt || serverTimestamp(),
          settledBy: paymentData.settledBy || null
        },
        tableNames, // Update table names if they were missing
        subtotal,
        cgstAmount: gstCalculation.cgstAmount,
        sgstAmount: gstCalculation.sgstAmount,
        gstAmount: gstCalculation.totalGST,
        totalAmount: totalWithTax,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Clear pendingPaymentMethod after successful settlement
        pendingPaymentMethod: null
      });

      // Remove the order from Firestore manager_pending_orders collection
      const pendingQuery = query(
        collection(db, 'manager_pending_orders'),
        where('orderId', '==', orderId)
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      
      const batch = writeBatch(db);
      pendingSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Update table status to available
      if (orderData.tableIds && orderData.tableIds.length > 0) {
        await this.updateTablesStatus(orderData.tableIds, 'available', undefined, orderData.locationId);
      }

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, orderData.locationId, 'settled', paymentData.settledBy || 'manager', {
        paymentMethod: paymentMethodToUse,
        amount: paymentData.amount
      });

      console.log('✅ Order settled successfully:', orderId);
    } catch (error) {
      console.error('Error settling order:', error);
      throw error;
    }
  }

  private async updateTablesStatus(
    tableIds: string[],
    status: 'available' | 'occupied' | 'reserved',
    orderId?: string,
    locationId?: string
  ): Promise<void> {
    const batch = writeBatch(db);
    
    for (const tableId of tableIds) {
      const tableRef = doc(db, 'tables', tableId);
      const tableDoc = await getDoc(tableRef);
      
      // Only update if the table exists
      if (tableDoc.exists()) {
        const updateData: any = {
          status,
          updatedAt: serverTimestamp()
        };
        
        if (status === 'occupied' && orderId) {
          updateData.currentOrderId = orderId;
          updateData.occupiedAt = serverTimestamp();
        } else if (status === 'available') {
          updateData.currentOrderId = null;
        }
        
        batch.update(tableRef, updateData);
      } else {
        // Create the table if it doesn't exist (for test tables)
        if (tableId.startsWith('test-table-')) {
          console.log(`Creating test table ${tableId} as it doesn't exist`);
          const tableData = {
            name: tableId.replace('test-table-', 'Table '),
            locationId: locationId || 'default-location',
            capacity: 4,
            status,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...(status === 'occupied' && orderId && {
              currentOrderId: orderId,
              occupiedAt: serverTimestamp()
            })
          };
          batch.set(tableRef, tableData);
        } else {
          console.warn(`Table ${tableId} does not exist, skipping update`);
        }
      }
    }
    
    await batch.commit();
  }

  private async updateTemporaryOrderActivity(
    orderId: string,
    staffId: string
  ): Promise<void> {
    const tempOrdersQuery = query(
      collection(db, 'temporary_orders'),
      where('orderId', '==', orderId),
      where('staffId', '==', staffId)
    );
    
    const snapshot = await getDocs(tempOrdersQuery);
    if (!snapshot.empty) {
      const tempOrderRef = doc(db, 'temporary_orders', snapshot.docs[0].id);
      await updateDoc(tempOrderRef, {
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  // Update order (Manager edits order)
  async updateOrder(orderId: string, updatedOrder: any, managerId: string): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();
      const locationId = orderData.locationId;

      // Calculate new totals if items were updated
      let subtotal = updatedOrder.subtotal || 0;
      let cgstAmount = updatedOrder.cgstAmount || 0;
      let sgstAmount = updatedOrder.sgstAmount || 0;
      let gstAmount = updatedOrder.gstAmount || 0;
      let totalAmount = updatedOrder.totalAmount || 0;

      if (updatedOrder.items && updatedOrder.items.length > 0) {
        subtotal = updatedOrder.items.reduce((total: number, item: OrderItem) => total + (item.price * item.quantity), 0);
        const gstCalculation = await this.calculateOrderGST(subtotal, locationId);
        cgstAmount = gstCalculation.cgstAmount;
        sgstAmount = gstCalculation.sgstAmount;
        gstAmount = gstCalculation.totalGST;
        totalAmount = subtotal + gstAmount;
      }

      // Handle customer info - support both old customerName and new customerInfo structure
      let customerName = orderData.customerName; // fallback to existing value
      if (updatedOrder.customerInfo?.name) {
        customerName = updatedOrder.customerInfo.name;
      } else if (updatedOrder.customerName !== undefined) {
        customerName = updatedOrder.customerName;
      }

      // Prepare update data - only include fields that are defined
      const updateData: any = {
        items: updatedOrder.items || orderData.items,
        paymentMethod: updatedOrder.paymentMethod || orderData.paymentMethod,
        notes: updatedOrder.notes !== undefined ? updatedOrder.notes : (orderData.notes || null),
        subtotal,
        cgstAmount,
        sgstAmount,
        gstAmount,
        totalAmount,
        updatedAt: serverTimestamp(),
        updatedBy: managerId
      };

      // Only include customerName if it's defined (not undefined)
      if (customerName !== undefined) {
        updateData.customerName = customerName;
      }

      // Only include customerInfo if it's defined
      if (updatedOrder.customerInfo !== undefined) {
        updateData.customerInfo = updatedOrder.customerInfo;
      }

      // Update main order
      await updateDoc(orderRef, updateData);

      // Create order history entry
      const historyData: any = {
        itemsCount: updatedOrder.items?.length || 0,
        totalAmount,
        notes: updatedOrder.notes !== undefined ? updatedOrder.notes : (orderData.notes || null)
      };

      // Only include customerName in history if it's defined
      if (customerName !== undefined) {
        historyData.customerName = customerName;
      }

      await this.createOrderHistoryEntry(orderId, orderData.locationId, 'updated', managerId, historyData);

      console.log('✅ Order updated:', orderId);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  // Delete order (Staff cancels order)
  async deleteOrder(orderId: string, staffId: string): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();

      // Update order status to cancelled
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: staffId,
        updatedAt: serverTimestamp()
      });

      // Remove from temporary orders
      await this.removeTemporaryOrder(orderId);

      // Remove from manager pending orders
      await this.removeManagerPendingOrder(orderId);

      // Update table status to available (release tables)
      if (orderData.tableIds && orderData.tableIds.length > 0) {
        await this.updateTablesStatus(orderData.tableIds, 'available', undefined, orderData.locationId);
      }

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, orderData.locationId, 'cancelled', staffId, {
        tableIds: orderData.tableIds,
        orderType: orderData.orderType
      });

      console.log('✅ Order deleted successfully:', orderId);
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  private async removeTemporaryOrder(orderId: string): Promise<void> {
    const tempOrdersQuery = query(
      collection(db, 'temporary_orders'),
      where('orderId', '==', orderId)
    );
    
    const snapshot = await getDocs(tempOrdersQuery);
    const batch = writeBatch(db);
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  // Create manager order directly
  async createManagerOrder(
    orderData: OrderFormData,
    manager: User,
    locationId: string,
    franchiseId: string
  ): Promise<string> {
    try {
      const orderNumber = `MGR-${Date.now().toString().slice(-6)}`;
      
      // Fetch table names if not provided
      let tableNames = orderData.tableNames || [];
      if ((!tableNames || tableNames.length === 0) && orderData.tableIds && orderData.tableIds.length > 0) {
        try {
          // Fetch table documents to get their names
          const tablePromises = orderData.tableIds.map((tableId: string) => 
            getDoc(doc(db, 'tables', tableId))
          );
          const tableDocs = await Promise.all(tablePromises);
          
          tableNames = tableDocs.map(tableDoc => {
            if (tableDoc.exists()) {
              return `Table ${tableDoc.data().name}`;
            }
            return tableId; // Fallback to ID if table not found
          });
        } catch (error) {
          console.error('Error fetching table names:', error);
          // Fallback to table IDs
          tableNames = orderData.tableIds;
        }
      }
      
      // Create main order document
      const orderDoc: Record<string, any> = {
        orderNumber,
        locationId,
        franchiseId,
        tableIds: orderData.tableIds,
        tableNames, // Use the fetched table names
        staffId: manager.uid,
        orderType: orderData.orderType || 'dinein',
        status: 'ongoing',
        items: orderData.items || [],
        subtotal: 0,
        gstAmount: 0,
        totalAmount: 0,
        sessionStartedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isManagerOrder: true
      };

      // Only include fields that are not undefined
      if (orderData.orderMode !== undefined) {
        orderDoc.orderMode = orderData.orderMode;
      }
      if (orderData.customerName !== undefined) {
        orderDoc.customerName = orderData.customerName;
      }
      if (orderData.customerPhone !== undefined) {
        orderDoc.customerPhone = orderData.customerPhone;
      }
      if (orderData.deliveryAddress !== undefined) {
        orderDoc.deliveryAddress = orderData.deliveryAddress;
      }
      if (orderData.notes !== undefined) {
        orderDoc.notes = orderData.notes;
      }

      const orderRef = await addDoc(collection(db, 'orders'), orderDoc);
      const orderId = orderRef.id;

      // Create manager pending order entry
      const managerPendingDoc = {
        orderId,
        locationId,
        locationName: await this.getLocationName(locationId),
        franchiseId,
        createdBy: manager.uid,
        createdByName: manager.name || manager.email || 'Unknown Manager',
        createdAt: serverTimestamp(),
        priority: 'normal',
        status: 'pending',
        notes: 'Manager created order',
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'manager_pending_orders'), managerPendingDoc);

      // Update table status to occupied
      await this.updateTablesStatus(orderData.tableIds, 'occupied', orderId, locationId);

      // Create order history entry
      await this.createOrderHistoryEntry(orderId, locationId, 'created', manager.uid, {
        orderNumber,
        tableIds: orderData.tableIds,
        orderType: orderData.orderType,
        isManagerOrder: true
      });

      console.log('✅ Manager order created:', orderId);
      return orderId;
    } catch (error) {
      console.error('Error creating manager order:', error);
      throw error;
    }
  }

  private async removeManagerPendingOrder(orderId: string): Promise<void> {
    const pendingQuery = query(
      collection(db, 'manager_pending_orders'),
      where('orderId', '==', orderId)
    );
    
    const snapshot = await getDocs(pendingQuery);
    const batch = writeBatch(db);
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  // Update order pending payment method
  async updateOrderPendingPaymentMethod(orderId: string, paymentMethod: 'cash' | 'card' | 'upi'): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      
      await updateDoc(orderRef, {
        pendingPaymentMethod: paymentMethod,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Pending payment method updated:', orderId, paymentMethod);
    } catch (error) {
      console.error('Error updating pending payment method:', error);
      throw error;
    }
  }

  // Get user details by ID
  async getUserDetails(userId: string): Promise<{ email: string; role: string; displayName?: string } | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          email: userData.email || 'Unknown',
          role: userData.role || 'Unknown',
          displayName: userData.displayName
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  // Get staff temporary orders directly (non-real-time)
  async getStaffTemporaryOrders(
    staffId: string,
    locationId: string
  ): Promise<TemporaryOrder[]> {
    try {
      const tempOrdersQuery = query(
        collection(db, 'temporary_orders'),
        where('staffId', '==', staffId),
        where('locationId', '==', locationId)
      );

      const tempSnapshot = await getDocs(tempOrdersQuery);
      const tempOrderIds = tempSnapshot.docs.map(doc => doc.data().orderId);
      
      if (tempOrderIds.length === 0) {
        return [];
      }

      // Get full order details - split into multiple queries to avoid 'in' clause limits
      const orders: TemporaryOrder[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < tempOrderIds.length; i += batchSize) {
        const batch = tempOrderIds.slice(i, i + batchSize);
        const ordersQuery = query(
          collection(db, 'orders'),
          where(documentId(), 'in', batch)
        );
        
        const orderSnapshot = await getDocs(ordersQuery);
        orderSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'temporary' || data.status === 'ongoing') {
            orders.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
              sessionStartedAt: data.sessionStartedAt?.toDate()
            } as TemporaryOrder);
          }
        });
      }

      // Sort client-side by createdAt descending
      orders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      return orders;
    } catch (error) {
      console.error('Error getting staff temporary orders:', error);
      return [];
    }
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<any | null> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        return null;
      }
      
      const orderData = orderDoc.data();
      return {
        id: orderDoc.id,
        ...orderData,
        createdAt: orderData.createdAt?.toDate(),
        updatedAt: orderData.updatedAt?.toDate(),
        sessionStartedAt: orderData.sessionStartedAt?.toDate(),
        transferredAt: orderData.transferredAt?.toDate(),
        settledAt: orderData.settledAt?.toDate(),
        completedAt: orderData.completedAt?.toDate()
      };
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      throw error;
    }
  }

  private async createOrderHistoryEntry(
    orderId: string,
    locationId: string,
    action: string,
    performedBy: string,
    changes: any
  ): Promise<void> {
    const historyDoc = {
      orderId,
      locationId,
      action,
      performedBy,
      changes,
      timestamp: serverTimestamp()
    };
    
    await addDoc(collection(db, 'order_history'), historyDoc);
  }
}

// Export singleton instance
export const orderService = OrderService.getInstance();