import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useOrders } from '../../contexts/OrderContext';
import { useReturns } from '../../contexts/ReturnContext';
import { useStock } from '../../contexts/StockContext';

const DataDebug: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales, loading: salesLoading, error: salesError } = useSales();
  const { menuItems, loading: menuLoading, error: menuError } = useMenuItems();
  const { categories, loading: catLoading, error: catError } = useCategories();
  const { orders, loading: orderLoading, error: orderError } = useOrders();
  const { returns, loading: returnLoading, error: returnError } = useReturns();
  const { stockUpdates, loading: stockLoading, error: stockError } = useStock();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm max-h-96 overflow-y-auto text-xs">
      <h3 className="font-bold mb-2">Data Debug</h3>
      
      <div className="mb-2">
        <strong>User:</strong> {currentUser?.email} ({currentUser?.role})
        {currentUser?.franchiseId && <span> | Franchise: {currentUser.franchiseId.slice(-6)}</span>}
        {currentUser?.locationId && <span> | Location: {currentUser.locationId.slice(-6)}</span>}
      </div>

      <div className="mb-2">
        <strong>Sales:</strong> {salesLoading ? 'Loading...' : `${sales.length} items`}
        {salesError && <span className="text-red-500"> Error: {salesError}</span>}
      </div>

      <div className="mb-2">
        <strong>Menu Items:</strong> {menuLoading ? 'Loading...' : `${menuItems.length} items`}
        {menuError && <span className="text-red-500"> Error: {menuError}</span>}
      </div>

      <div className="mb-2">
        <strong>Categories:</strong> {catLoading ? 'Loading...' : `${categories.length} items`}
        {catError && <span className="text-red-500"> Error: {catError}</span>}
      </div>

      <div className="mb-2">
        <strong>Orders:</strong> {orderLoading ? 'Loading...' : `${orders.length} items`}
        {orderError && <span className="text-red-500"> Error: {orderError}</span>}
      </div>

      <div className="mb-2">
        <strong>Returns:</strong> {returnLoading ? 'Loading...' : `${returns.length} items`}
        {returnError && <span className="text-red-500"> Error: {returnError}</span>}
      </div>

      <div className="mb-2">
        <strong>Stock Updates:</strong> {stockLoading ? 'Loading...' : `${stockUpdates.length} items`}
        {stockError && <span className="text-red-500"> Error: {stockError}</span>}
      </div>

      <button 
        onClick={() => (document.querySelector('.data-debug') as HTMLElement)?.remove()}
        className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs"
      >
        Close
      </button>
    </div>
  );
};

export default DataDebug;