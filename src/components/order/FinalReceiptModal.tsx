import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  X, 
  Printer
} from 'lucide-react';
import Button from '../ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { orderService } from '../../services/orderService';
import { getFranchiseReceiptData } from '../../utils/franchiseUtils';

interface FinalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    orderNumber: string;
    tableNames?: string[];
    tableIds?: string[];
    items: {
      name: string;
      price: number;
      quantity: number;
      modifications?: string[];
      portionSize?: 'half' | 'full';
    }[];
    customerName?: string;
    notes?: string;
    subtotal?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    gstAmount?: number;
    totalAmount?: number;
    completedAt?: any;
    paymentData?: {
      paymentMethod?: string;
      amount?: number;
      settledAt?: any;
    };
    serviceCharge?: number;
    deliveryCharge?: number;
    packagingCharge?: number;
    discount?: number;
    cgst?: number;
    sgst?: number;
    total?: number;
    locationId?: string;
  };
  paymentMethod: string;
  isReadOnly?: boolean;
  onEditPaymentMethod?: () => void;
}

const FinalReceiptModal: React.FC<FinalReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  paymentMethod,
  isReadOnly = false,
  onEditPaymentMethod
}) => {
  const [gstSettings, setGstSettings] = useState<{ cgst: number; sgst: number }>({ cgst: 2.5, sgst: 2.5 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [franchiseData, setFranchiseData] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl: string | null;
    gstNumber: string | null;
  } | null>(null);

  // Fetch GST settings and franchise data when order changes
  useEffect(() => {
    const fetchGstSettings = async () => {
      if (order?.locationId) {
        try {
          const settings = await orderService.getLocationGSTSettings(order.locationId);
          setGstSettings(settings);
        } catch (error) {
          console.error('Error fetching GST settings:', error);
          setGstSettings({ cgst: 2.5, sgst: 2.5 }); // Fallback to 2.5% each
        }
      }
    };

    const fetchFranchiseData = async () => {
      if (order?.locationId) {
        const data = await getFranchiseReceiptData(order.locationId);
        setFranchiseData(data);
      }
    };

    if (isOpen && order) {
      fetchGstSettings();
      fetchFranchiseData();
    }
  }, [order, isOpen]);

  if (!isOpen) return null;

  // Calculate totals properly
  const calculateSubtotal = () => {
    if (order.subtotal) return order.subtotal;
    return order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  };

  const calculateCGST = () => {
    if (order.cgstAmount) return order.cgstAmount;
    if (order.cgst) return order.cgst;
    const subtotal = calculateSubtotal();
    return subtotal * (gstSettings.cgst / 100);
  };

  const calculateSGST = () => {
    if (order.sgstAmount) return order.sgstAmount;
    if (order.sgst) return order.sgst;
    const subtotal = calculateSubtotal();
    return subtotal * (gstSettings.sgst / 100);
  };

  const calculateGrandTotal = () => {
    if (order.totalAmount) return order.totalAmount;
    if (order.total) return order.total;
    
    const subtotal = calculateSubtotal();
    const cgst = calculateCGST();
    const sgst = calculateSGST();
    const serviceCharge = order.serviceCharge || 0;
    const deliveryCharge = order.deliveryCharge || 0;
    const packagingCharge = order.packagingCharge || 0;
    const discount = order.discount || 0;
    
    return subtotal + cgst + sgst + serviceCharge + deliveryCharge + packagingCharge - discount;
  };

  const subtotal = calculateSubtotal();
  const cgst = calculateCGST();
  const sgst = calculateSGST();
  const grandTotal = calculateGrandTotal();

  // Format date for receipt
  const formatReceiptDate = (dateInput?: any) => {
    if (isReadOnly && order.completedAt) {
      dateInput = order.completedAt;
    } else if (isReadOnly && order.paymentData?.settledAt) {
      dateInput = order.paymentData.settledAt;
    } else {
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

  // Get the actual payment method from order data if available
  const actualPaymentMethod = order.paymentData?.paymentMethod || paymentMethod;

  // Function to convert table IDs to table numbers if table names are not available
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

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '0';
    }
    return Math.round(price).toString();
  };

  // Generate HTML content for printing with proper grid layout and logo
  const getReceiptHTMLContent = () => {
    const { date: receiptDate, time: receiptTime } = formatReceiptDate();
    const tableDisplay = getTableDisplay(order.tableNames, order.tableIds);
    // Use franchise logo if available, otherwise use default
    const logoUrl = franchiseData?.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/restpossys.firebasestorage.app/o/WhatsApp%20Image%202025-10-12%20at%2006.01.10_f3bd32d3.jpg?alt=media&token=d3f11b5d-c210-4c1d-98a2-5521ff2e07fd';
    
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
            
            ${order.items.map(item => {
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
            }).join('')}
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
            <div class="total-row grand-total">
                <div class="total-label">Grand Total</div>
                <div class="total-value">${formatPrice(grandTotal)}</div>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="payment-info">
            <div>Paid by: ${(actualPaymentMethod || 'Cash').toUpperCase()}</div>
        </div>
        
        <div class="footer">
            <div>Thank you for dining with us!</div>
        </div>
        
        <div class="brand">
            <div>Powered by FORKFLOW POS</div>
        </div>
    </div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    setPrintStatus(null);
    
    try {
      setIsProcessing(true);
      
      // Get the formatted receipt content as HTML
      const receiptHTML = getReceiptHTMLContent();
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
        
        setPrintStatus({ type: 'success', message: 'Receipt sent to printer successfully!' });
      } else {
        throw new Error('Failed to open print window');
      }
    } catch (error) {
      console.error('Print failed:', error);
      setPrintStatus({ type: 'error', message: 'Failed to print receipt. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const { date: receiptDate, time: receiptTime } = formatReceiptDate();
  const tableDisplay = getTableDisplay(order.tableNames, order.tableIds);
  // Use franchise logo if available, otherwise use default
  const logoUrl = franchiseData?.logoUrl || 'https://firebasestorage.googleapis.com/v0/b/restpossys.firebasestorage.app/o/WhatsApp%20Image%202025-10-12%20at%2006.01.10_f3bd32d3.jpg?alt=media&token=d3f11b5d-c210-4c1d-98a2-5521ff2e07fd';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Receipt size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Final Receipt</h2>
                <p className="text-sm text-gray-600">Order {order.orderNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={isProcessing}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Receipt"
              >
                {isProcessing ? (
                  <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Printer size={20} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-6">
            {/* Print Status */}
            {printStatus && (
              <Alert className={`mb-4 ${
                printStatus.type === 'success' ? 'border-green-500 bg-green-50' :
                printStatus.type === 'error' ? 'border-red-500 bg-red-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <AlertDescription>
                  {printStatus.message}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Receipt Preview */}
            <div className="bg-white border border-gray-200 rounded-lg p-6" style={{ 
                fontFamily: 'Courier New, monospace', 
                fontSize: '12px', 
                lineHeight: '1.3',
                width: '100%', 
                maxWidth: '350px', 
                margin: '0 auto'
              }}>
              {/* Logo */}
              <div className="text-center mb-4">
                <img 
                  src={logoUrl} 
                  alt="Restaurant Logo" 
                  className="mx-auto"
                  style={{ width: '160px', height: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
                />
              </div>
              
              {/* Header */}
              <div className="text-center mb-4">
                <div className="text-base font-bold">{franchiseData?.name || 'FORKFLOW POS'}</div>
                <div className="text-xs text-gray-600">{franchiseData?.address || '123 Main Street, City'}</div>
                <div className="text-xs text-gray-600">Phone: {franchiseData?.phone || '+91 98765 43210'}</div>
                {franchiseData?.gstNumber && (
                  <div className="text-xs text-gray-600">GSTIN: {franchiseData.gstNumber}</div>
                )}
              </div>
              
              <div className="border-t border-b border-gray-400 py-2 my-3">
                <div className="text-center text-xs font-bold">
                  <div>Date: {receiptDate}    Time: {receiptTime}</div>
                  {tableDisplay && tableDisplay !== 'N/A' ? (
                    <>
                      <div>Table: {tableDisplay}</div>
                      <div>Order: #{order.orderNumber}</div>
                    </>
                  ) : (
                    <div>Order: #{order.orderNumber}</div>
                  )}
                </div>
              </div>
              
              {/* Items Grid */}
              <div className="mb-4">
                <div className="grid grid-cols-[2fr_40px_50px_50px] gap-1 mb-2 font-black text-xs border-b border-gray-400 pb-1">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Rate</div>
                  <div className="text-right">Total</div>
                </div>
                
                {order.items.map((item, index) => {
                  const itemTotal = item.price * item.quantity;
                  return (
                    <div key={index} className="grid grid-cols-[2fr_40px_50px_50px] gap-1 mb-2 text-xs font-semibold">
                      <div className="break-words">
                        {item.name}
                        {item.portionSize === 'half' && (
                          <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded">Half</span>
                        )}
                        {item.portionSize === 'full' && (
                          <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">Full</span>
                        )}
                      </div>
                      <div className="text-center">{item.quantity}</div>
                      <div className="text-right">{formatPrice(item.price)}</div>
                      <div className="text-right">{formatPrice(itemTotal)}</div>
                      {item.modifications && item.modifications.length > 0 && (
                        <div className="col-span-4 text-xs text-gray-500 italic ml-2">
                          {item.modifications.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t border-b border-gray-400 py-2 my-3">
                {/* Totals */}
                <div className="space-y-1 text-xs font-semibold">
                  <div className="flex justify-between">
                    <div>Subtotal</div>
                    <div>{formatPrice(subtotal)}</div>
                  </div>
                  {cgst > 0 && (
                    <div className="flex justify-between">
                      <div>CGST ({gstSettings.cgst}%)</div>
                      <div>{formatPrice(cgst)}</div>
                    </div>
                  )}
                  {sgst > 0 && (
                    <div className="flex justify-between">
                      <div>SGST ({gstSettings.sgst}%)</div>
                      <div>{formatPrice(sgst)}</div>
                    </div>
                  )}
                  {order.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <div>Service Charge</div>
                      <div>{formatPrice(order.serviceCharge)}</div>
                    </div>
                  )}
                  {order.deliveryCharge > 0 && (
                    <div className="flex justify-between">
                      <div>Delivery Charge</div>
                      <div>{formatPrice(order.deliveryCharge)}</div>
                    </div>
                  )}
                  {order.packagingCharge > 0 && (
                    <div className="flex justify-between">
                      <div>Packaging Charge</div>
                      <div>{formatPrice(order.packagingCharge)}</div>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <div>Discount</div>
                      <div>-{formatPrice(order.discount)}</div>
                    </div>
                  )}
                  <div className="border-t border-gray-400 pt-1 flex justify-between font-black">
                    <div>Grand Total</div>
                    <div>{formatPrice(grandTotal)}</div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <div className="font-bold text-sm">Paid by: {(actualPaymentMethod || 'Cash').toUpperCase()}</div>
              </div>
              
              <div className="text-center mb-4 italic text-xs font-bold">
                <div>Thank you for dining with us!</div>
              </div>
              
              <div className="text-center font-bold text-xs">
                <div>Powered by FORKFLOW POS</div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            {/* Left side - Edit Payment Method */}
            {!isReadOnly && onEditPaymentMethod && (
              <Button
                onClick={onEditPaymentMethod}
                disabled={isProcessing}
                variant="outline"
                className="text-sm"
              >
                Edit Payment Method
              </Button>
            )}
            
            {/* Center - Print Receipt */}
            <Button
              onClick={handlePrint}
              disabled={isProcessing}
            >
              <Printer size={16} className="mr-2" />
              Print Receipt
            </Button>
            
            {/* Right side spacer for balance */}
            <div className="w-32"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalReceiptModal;