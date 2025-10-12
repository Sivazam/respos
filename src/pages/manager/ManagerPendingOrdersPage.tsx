import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useTemporaryOrdersDisplay } from '../../contexts/TemporaryOrdersDisplayContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../contexts/OrderContext';
import { format } from 'date-fns';
import { 
  Search, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Receipt,
  CreditCard,
  Smartphone,
  Wallet,
  Eye,
  Edit,
  Printer,
  Trash2
} from 'lucide-react';
import Input from '../../components/ui/Input';
import ViewOrderModal from '../../components/order/ViewOrderModal';
import EditOrderModal from '../../components/order/EditOrderModal';
import FinalReceiptModal from '../../components/order/FinalReceiptModal';
import PaymentMethodModal from '../../components/order/PaymentMethodModal';
import PaymentReceivedModal from '../../components/order/PaymentReceivedModal';
import { useTemporaryOrder } from '../../contexts/TemporaryOrderContext';
import { orderService } from '../../services/orderService';
import toast from 'react-hot-toast';

const ManagerPendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { temporaryOrders } = useTemporaryOrdersDisplay();
  const { currentUser } = useAuth();
  const { createOrder } = useOrders();
  const { completeOrder } = useTemporaryOrder();
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewOrderModal, setShowViewOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentReceivedModal, setShowPaymentReceivedModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');

  // Filter temporary orders
  const filteredOrders = useMemo(() => {
    return temporaryOrders.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.customerName?.toLowerCase().includes(searchLower) ||
        order.tableNames?.some((table: string) => table.toLowerCase().includes(searchLower)) ||
        order.items?.some((item: any) => item.name.toLowerCase().includes(searchLower))
      );
    });
  }, [temporaryOrders, searchTerm]);

  // Handle settle bill
  const handleSettleBill = (order: any) => {
    setSelectedOrder(order);
    setShowPaymentReceivedModal(true);
  };

  // Handle view order
  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowViewOrderModal(true);
  };

  // Handle edit order
  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setShowEditOrderModal(true);
  };

  // Handle print order
  const handlePrintOrder = (order: any) => {
    setSelectedOrder(order);
    
    // Check if payment method is already set
    if (order.paymentData?.paymentMethod) {
      // Directly show receipt with existing payment method
      setSelectedPaymentMethod(order.paymentData.paymentMethod as 'cash' | 'card' | 'upi');
      setShowReceiptModal(true);
    } else {
      // Show payment method selection first
      setShowPaymentMethodModal(true);
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (order: any) => {
    if (window.confirm(`Are you sure you want to delete order #${order.orderNumber}?`)) {
      try {
        await completeOrder(order.id);
        toast.success('Order deleted successfully!');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order. Please try again.');
      }
    }
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = async (paymentMethod: 'cash' | 'card' | 'upi') => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    try {
      const total = calculateOrderTotal(selectedOrder);
      
      // Update the order with payment method
      const updatedOrder = {
        ...selectedOrder,
        paymentData: {
          paymentMethod,
          amount: total,
          settledAt: new Date(),
          notes: `Payment via ${paymentMethod}`
        }
      };

      // Save the payment method to localStorage for persistence
      const managerOrderKey = `manager_pending_${selectedOrder.id}`;
      localStorage.setItem(managerOrderKey, JSON.stringify(updatedOrder));

      setSelectedPaymentMethod(paymentMethod);
      setSelectedOrder(updatedOrder);
      
      setShowPaymentMethodModal(false);
      setShowReceiptModal(true);
      
      toast.success('Payment method selected!');
    } catch (error) {
      console.error('Error selecting payment method:', error);
      toast.error('Failed to select payment method. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment received confirmation
  const handlePaymentReceivedConfirm = async () => {
    if (!selectedOrder || !currentUser) return;
    
    setIsProcessing(true);
    try {
      const total = calculateOrderTotal(selectedOrder);
      
      // Create a completed order from the temporary order
      const orderData = {
        tableIds: selectedOrder.tableIds || [],
        tableNames: selectedOrder.tableNames || [],
        orderType: selectedOrder.orderType || 'dinein',
        orderMode: selectedOrder.orderMode,
        items: selectedOrder.items || [],
        customerName: selectedOrder.customerName,
        customerPhone: selectedOrder.customerPhone,
        deliveryAddress: selectedOrder.deliveryAddress,
        notes: selectedOrder.notes,
        status: 'completed',
        paymentMethod: selectedOrder.paymentData?.paymentMethod || 'cash',
        paymentStatus: 'paid',
        settledAt: new Date(),
        completedAt: new Date(),
        totalAmount: total,
        subtotal: selectedOrder.subtotal || total,
        tax: selectedOrder.tax || 0,
        gstAmount: selectedOrder.gstAmount || 0,
        total: total,
        locationId: currentUser.locationId,
        tableId: selectedOrder.tableIds?.[0] || null, // Use first tableId or null
      };

      // Create the order in regular orders collection
      await createOrder(orderData);
      
      // Remove from temporary orders
      await orderService.completeOrder(selectedOrder.id, currentUser.uid);
      
      toast.success('Payment received and order settled!');
      setShowPaymentReceivedModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error settling payment:', error);
      toast.error('Failed to settle payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle edit payment method from receipt
  const handleEditPaymentMethod = () => {
    setShowReceiptModal(false);
    setShowPaymentMethodModal(true);
  };

  // Get table display name
  const getTableDisplayName = (tableIds?: string[], tableNames?: string[]) => {
    if (tableNames && tableNames.length > 0) {
      return tableNames.join(', ');
    }
    
    if (tableIds && tableIds.length > 0) {
      const tableNumbers = tableIds.map(id => {
        const tableMatch = id.match(/table-(\d+)/i);
        if (tableMatch) {
          return `Table ${tableMatch[1]}`;
        }
        if (/^\d+$/.test(id)) {
          return `Table ${id}`;
        }
        const numberMatch = id.match(/\d+/);
        if (numberMatch) {
          return `Table ${numberMatch[0]}`;
        }
        return id;
      });
      return tableNumbers.join(', ');
    }
    
    return 'N/A';
  };

  // Calculate order total
  const calculateOrderTotal = (order: any) => {
    const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    const cgst = subtotal * 0.025; // 2.5% CGST
    const sgst = subtotal * 0.025; // 2.5% SGST
    return subtotal + cgst + sgst;
  };

  // Get order wait time
  const getOrderWaitTime = (orderCreatedAt: string) => {
    const now = new Date().getTime();
    const created = new Date(orderCreatedAt).getTime();
    const minutes = Math.floor((now - created) / (1000 * 60));
    
    if (minutes < 5) return { text: `${minutes}m`, color: 'text-green-600' };
    if (minutes < 15) return { text: `${minutes}m`, color: 'text-yellow-600' };
    return { text: `${minutes}m`, color: 'text-red-600' };
  };

  return (
    <>
      <DashboardLayout title="Pending Orders">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by order number, customer name, table, or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search size={18} className="text-gray-500" />}
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredOrders.length} orders found
              </div>
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wait Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => {
                      const waitTime = getOrderWaitTime(order.createdAt);
                      const total = calculateOrderTotal(order);
                      
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.orderNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customerName || 'Guest'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}
                              {order.tableIds && (
                                <span> • {getTableDisplayName(order.tableIds, order.tableNames)}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {order.items?.slice(0, 2).map((item: any, index: number) => (
                                <div key={index}>
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                              {order.items?.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{order.items.length - 2} more items
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{total.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${waitTime.color}`}>
                              <Clock className="inline w-4 h-4 mr-1" />
                              {waitTime.text}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleViewOrder(order)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View Order"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Edit Order"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handlePrintOrder(order)}
                                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                                title="Print Order"
                              >
                                <Printer size={16} />
                              </button>
                              <button
                                onClick={() => handleSettleBill(order)}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                title="Settle Bill"
                              >
                                Settle
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-8">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'No orders match your search criteria.' : 'There are no pending orders at the moment.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => {
          setShowPaymentMethodModal(false);
          setSelectedOrder(null);
        }}
        onSelect={handlePaymentMethodSelect}
        isProcessing={isProcessing}
      />

      {/* Final Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <FinalReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedOrder(null);
          }}
          order={{
            ...selectedOrder,
            paymentData: selectedOrder.paymentData || {
              paymentMethod: selectedPaymentMethod,
              amount: calculateOrderTotal(selectedOrder),
              settledAt: new Date()
            }
          }}
          paymentMethod={selectedPaymentMethod}
          isReadOnly={false}
          onEditPaymentMethod={handleEditPaymentMethod}
        />
      )}

      {/* Payment Received Modal */}
      <PaymentReceivedModal
        isOpen={showPaymentReceivedModal}
        onClose={() => {
          setShowPaymentReceivedModal(false);
          setSelectedOrder(null);
        }}
        onConfirm={handlePaymentReceivedConfirm}
        isProcessing={isProcessing}
      />

      {/* View Order Modal */}
      {showViewOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Order Details - #{selectedOrder.orderNumber}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-700">Customer Information</h4>
                        <p className="text-sm text-gray-600">Name: {selectedOrder.customerName || 'Guest'}</p>
                        <p className="text-sm text-gray-600">Type: {selectedOrder.orderType === 'dine_in' ? 'Dine In' : 'Takeaway'}</p>
                        <p className="text-sm text-gray-600">Table: {getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames)}</p>
                        <p className="text-sm text-gray-600">Date: {format(new Date(selectedOrder.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-700">Order Items</h4>
                        <div className="mt-2 space-y-2">
                          {selectedOrder.items?.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal:</span>
                          <span>₹{selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>CGST (2.5%):</span>
                          <span>₹{(selectedOrder.subtotal * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>SGST (2.5%):</span>
                          <span>₹{(selectedOrder.subtotal * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>₹{calculateOrderTotal(selectedOrder).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowViewOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrderModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Edit Order - #{selectedOrder.orderNumber}
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> To edit this order, you'll be redirected to the Manager POS page where you can modify the items.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700">Current Order Information</h4>
                        <p className="text-sm text-gray-600">Customer: {selectedOrder.customerName || 'Guest'}</p>
                        <p className="text-sm text-gray-600">Table: {getTableDisplayName(selectedOrder.tableIds, selectedOrder.tableNames)}</p>
                        <p className="text-sm text-gray-600">Items: {selectedOrder.items?.length || 0}</p>
                        <p className="text-sm text-gray-600">Total: ₹{calculateOrderTotal(selectedOrder).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    // Navigate to POS with order data for editing
                    navigate('/pos', {
                      state: {
                        orderType: selectedOrder.orderType || 'dinein',
                        tableIds: selectedOrder.tableIds || [],
                        isOngoing: true,
                        fromLocation: '/manager/pending-orders',
                        orderId: selectedOrder.id
                      }
                    });
                    setShowEditOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Edit in POS
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowEditOrderModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManagerPendingOrdersPage;