import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { getFranchiseReceiptData } from '../../utils/franchiseUtils';
import { useAuth } from '../../contexts/AuthContext';

const PrintReceiptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gstSettings, setGstSettings] = useState<{ cgst: number; sgst: number }>({ cgst: 2.5, sgst: 2.5 });
  const [franchiseData, setFranchiseData] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    gstNumber: string | null;
  } | null>(null);

  // Auto-print and close functionality
  useEffect(() => {
    if (!loading && order) {
      // Wait a moment to ensure receipt content fully renders
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      // Automatically close window after printing
      window.onafterprint = () => {
        window.close();
      };

      return () => clearTimeout(timer);
    }
  }, [loading, order]);

  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      // Get order ID from query parameter
      const orderId = searchParams.get('id');
      
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch order details
        const orderData = await orderService.getOrderById(orderId);
        if (!orderData) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        setOrder(orderData);

        // Fetch GST settings
        if (orderData.locationId) {
          try {
            const settings = await orderService.getLocationGSTSettings(orderData.locationId);
            setGstSettings(settings);
          } catch (error) {
            console.error('Error fetching GST settings:', error);
            setGstSettings({ cgst: 2.5, sgst: 2.5 }); // Fallback
          }

          // Fetch franchise data
          try {
            const data = await getFranchiseReceiptData(orderData.locationId);
            setFranchiseData(data);
          } catch (error) {
            console.error('Error fetching franchise data:', error);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching order:', error);
        setError('Failed to load order data');
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [searchParams]);

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '0';
    }
    return Math.round(price).toString();
  };

  const formatReceiptDate = (dateInput?: any) => {
    if (!dateInput) {
      dateInput = new Date();
    }

    try {
      let dateObj: Date;
      
      if (dateInput?.toDate) {
        dateObj = dateInput.toDate();
      } else if (dateInput?.seconds) {
        dateObj = new Date(dateInput.seconds * 1000);
      } else if (typeof dateInput === 'string') {
        dateObj = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        dateObj = dateInput;
      } else {
        dateObj = new Date();
      }
      
      return {
        date: dateObj.toLocaleDateString('en-IN'),
        time: dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return {
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    }
  };

  const getTableDisplay = (tableNames?: string[], tableIds?: string[]) => {
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

  const calculateSubtotal = () => {
    if (order?.subtotal) return order.subtotal;
    return order?.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
  };

  const calculateCGST = () => {
    if (order?.cgstAmount) return order.cgstAmount;
    if (order?.cgst) return order.cgst;
    const subtotal = calculateSubtotal();
    return subtotal * (gstSettings.cgst / 100);
  };

  const calculateSGST = () => {
    if (order?.sgstAmount) return order.sgstAmount;
    if (order?.sgst) return order.sgst;
    const subtotal = calculateSubtotal();
    return subtotal * (gstSettings.sgst / 100);
  };

  const calculateGrandTotal = () => {
    if (order?.totalAmount) return order.totalAmount;
    if (order?.total) return order.total;
    
    const subtotal = calculateSubtotal();
    const cgst = calculateCGST();
    const sgst = calculateSGST();
    const serviceCharge = order?.serviceCharge || 0;
    const deliveryCharge = order?.deliveryCharge || 0;
    const packagingCharge = order?.packagingCharge || 0;
    const discount = order?.discount || 0;
    const couponAmount = order?.appliedCoupon?.discountAmount || 0;
    
    return subtotal + cgst + sgst + serviceCharge + deliveryCharge + packagingCharge - discount - couponAmount;
  };

  // Generate HTML content for printing (same as FinalReceiptModal)
  const getReceiptHTMLContent = () => {
    if (!order) return '';

    const { date: receiptDate, time: receiptTime } = formatReceiptDate(order.completedAt || order.createdAt);
    const tableDisplay = getTableDisplay(order.tableNames, order.tableIds);
    const logoUrl = franchiseData?.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/restpossys.firebasestorage.app/o/WhatsApp%20Image%202025-10-12%20at%2006.01.10_f3bd32d3.jpg?alt=media&token=d3f11b5d-c210-4c1d-98a2-5521ff2e07fd';
    
    const subtotal = calculateSubtotal();
    const cgst = calculateCGST();
    const sgst = calculateSGST();
    const grandTotal = calculateGrandTotal();
    
    // Get payment method
    const paymentMethod = order.paymentData?.paymentMethod || order.paymentMethod || order.pendingPaymentMethod || 'cash';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt - Order #${order.orderNumber}</title>
    <style>
        @page {
            margin: 0;
            size: 80mm auto;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 5px;
            width: 72mm;
            background: white;
            color: black;
            line-height: 1.3;
        }
        
        .receipt {
            width: 100%;
            text-align: center;
        }
        
        .logo {
            margin-bottom: 12px;
            text-align: center;
        }
        
        .logo img {
            width: 160px;
            height: auto;
            max-height: auto;
            object-fit: contain;
        }
        
        .header {
            text-align: center;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .header-line {
            margin: 2px 0;
            font-size: 14px;
        }
        
        .header-subtitle {
            margin: 1px 0;
            font-size: 10px;
            font-weight: normal;
        }
        
        .divider {
            border-top: 1px solid #000;
            margin: 10px 0;
        }
        
        .order-info {
            text-align: center;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .items-section {
            margin-bottom: 10px;
        }
        
        .items-header {
            display: grid;
            grid-template-columns: 1.8fr 40px 55px 65px;
            gap: 2px;
            margin-bottom: 5px;
            font-weight: 900;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
            font-size: 11px;
        }
        
        .item {
            display: grid;
            grid-template-columns: 1.8fr 40px 55px 65px;
            gap: 2px;
            margin-bottom: 4px;
            font-size: 11px;
            font-weight: 600;
            align-items: start;
        }
        
        .item-name {
            text-align: left;
            white-space: normal;
            word-wrap: break-word;
            min-width: 0;
        }
        
        .item-qty {
            text-align: center;
        }
        
        .item-price {
            text-align: right;
        }
        
        .item-total {
            text-align: right;
        }
        
        .modifications {
            grid-column: 1 / -1;
            font-size: 9px;
            color: #666;
            text-align: left;
            margin-left: 10px;
            margin-bottom: 2px;
            font-style: italic;
        }
        
        .portion-tag-half {
            font-size: 8px;
            background-color: #fed7aa;
            color: #9a3412;
            padding: 1px 4px;
            border-radius: 3px;
            margin-left: 4px;
            font-weight: bold;
        }
        
        .portion-tag-full {
            font-size: 8px;
            background-color: #bbf7d0;
            color: #166534;
            padding: 1px 4px;
            border-radius: 3px;
            margin-left: 4px;
            font-weight: bold;
        }
        
        .totals {
            margin-top: 10px;
        }
        
        .total-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 10px;
            margin: 3px 0;
            font-size: 11px;
            font-weight: 600;
        }
        
        .total-label {
            text-align: left;
        }
        
        .total-value {
            text-align: right;
            min-width: 60px;
        }
        
        .grand-total {
            font-weight: 900;
            border-top: 1px solid #000;
            padding-top: 3px;
            font-size: 12px;
        }
        
        .payment-info {
            text-align: center;
            margin-top: 8px;
            font-weight: bold;
            font-size: 12px;
        }
        
        .footer {
            text-align: center;
            margin-top: 10px;
            font-style: italic;
            font-size: 10px;
            font-weight: bold;
        }
        
        .brand {
            text-align: center;
            margin-top: 5px;
            font-weight: bold;
            font-size: 10px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 3px;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="logo">
            <img src="${logoUrl}" alt="Restaurant Logo" />
        </div>
        
        <div class="header">
            <div class="header-line">${franchiseData?.name || 'FORKFLOW POS'}</div>
            <div class="header-subtitle">${franchiseData?.address || '123 Main Street, City'}</div>
            <div class="header-subtitle">Phone: ${franchiseData?.phone || '+91 98765 43210'}</div>
            ${franchiseData?.gstNumber ? `<div class="header-subtitle">GSTIN: ${franchiseData.gstNumber}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="order-info">
            <div>Date: ${receiptDate}    Time: ${receiptTime}</div>
            ${tableDisplay && tableDisplay !== 'N/A' ? 
              `<div>Table: ${tableDisplay}</div>
               <div>Order: #${order.orderNumber}</div>` : 
              `<div>Order: #${order.orderNumber}</div>`
            }
        </div>
        
        <div class="divider"></div>
        
        <div class="items-section">
            <div class="items-header">
                <div class="item-name">Item</div>
                <div class="item-qty">Qty</div>
                <div class="item-price">Rate</div>
                <div class="item-total">Total</div>
            </div>
            
            ${order.items?.map(item => {
              const itemName = item.name || 'Unknown Item';
              const quantity = item.quantity || 1;
              const price = item.price || 0;
              const itemTotal = price * quantity;
              const portionTag = item.portionSize === 'half' ? ' (Half)' : '';
              
              return `
                <div class="item">
                    <div class="item-name">${itemName}${portionTag}</div>
                    <div class="item-qty">${quantity}</div>
                    <div class="item-price">${formatPrice(price)}</div>
                    <div class="item-total">${formatPrice(itemTotal)}</div>
                    ${item.modifications && item.modifications.length > 0 ? 
                      `<div class="modifications">${item.modifications.join(', ')}</div>` : 
                      ''
                    }
                </div>
              `;
            }).join('') || ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="totals">
            <div class="total-row">
                <div class="total-label">Subtotal</div>
                <div class="total-value">${formatPrice(subtotal)}</div>
            </div>
            ${cgst > 0 ? `
              <div class="total-row">
                  <div class="total-label">CGST (${gstSettings.cgst}%)</div>
                  <div class="total-value">${formatPrice(cgst)}</div>
              </div>
            ` : ''}
            ${sgst > 0 ? `
              <div class="total-row">
                  <div class="total-label">SGST (${gstSettings.sgst}%)</div>
                  <div class="total-value">${formatPrice(sgst)}</div>
              </div>
            ` : ''}
            ${order.serviceCharge > 0 ? `
              <div class="total-row">
                  <div class="total-label">Service Charge</div>
                  <div class="total-value">${formatPrice(order.serviceCharge)}</div>
              </div>
            ` : ''}
            ${order.deliveryCharge > 0 ? `
              <div class="total-row">
                  <div class="total-label">Delivery Charge</div>
                  <div class="total-value">${formatPrice(order.deliveryCharge)}</div>
              </div>
            ` : ''}
            ${order.packagingCharge > 0 ? `
              <div class="total-row">
                  <div class="total-label">Packaging Charge</div>
                  <div class="total-value">${formatPrice(order.packagingCharge)}</div>
              </div>
            ` : ''}
            ${order.discount > 0 ? `
              <div class="total-row">
                  <div class="total-label">Discount</div>
                  <div class="total-value">-${formatPrice(order.discount)}</div>
              </div>
            ` : ''}
            ${order.appliedCoupon && order.appliedCoupon.discountAmount > 0 ? `
              <div class="total-row">
                  <div class="total-label">Coupon (${order.appliedCoupon.name})</div>
                  <div class="total-value">-${formatPrice(order.appliedCoupon.discountAmount)}</div>
              </div>
            ` : ''}
            <div class="total-row grand-total">
                <div class="total-label">Grand Total</div>
                <div class="total-value">${formatPrice(grandTotal)}</div>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="payment-info">
            <div>Payment: ${paymentMethod.toUpperCase()}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
            <div>Thank you for your order!</div>
            <div>Please visit again</div>
        </div>
        
        <div class="brand">
            <div>Powered by FORKFLOW POS</div>
        </div>
    </div>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px'
      }}>
        Loading receipt...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: 'red',
        textAlign: 'center',
        padding: '20px'
      }}>
        {error || 'Order not found'}
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: getReceiptHTMLContent() }} />
  );
};

export default PrintReceiptPage;