import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSales } from '../../contexts/SalesContext';
import { useMenuItems } from '../../contexts/MenuItemContext';
import { useCategories } from '../../contexts/CategoryContext';
import { useOrders } from '../../contexts/OrderContext';
import { useLocations } from '../../contexts/LocationContext';
import { useFranchises } from '../../contexts/FranchiseContext';

const ComprehensiveDebug: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales, loading: salesLoading, error: salesError } = useSales();
  const { menuItems, loading: menuLoading, error: menuError } = useMenuItems();
  const { categories, loading: catLoading, error: catError } = useCategories();
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();
  const { locations } = useLocations();
  const { franchises } = useFranchises();

  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed top-20 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-4xl max-h-96 overflow-y-auto z-40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">🔍 Comprehensive Debug</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* User Info */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
        <strong>Current User:</strong> {currentUser?.email} ({currentUser?.role})<br/>
        <strong>Franchise ID:</strong> {currentUser?.franchiseId}<br/>
        <strong>Location ID:</strong> {currentUser?.locationId}
      </div>

      {expanded && (
        <>
          {/* Sales Data */}
          <div className="mb-3 p-2 bg-blue-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <strong className="text-xs">📊 Sales ({sales.length})</strong>
              {salesLoading && <span className="text-xs text-blue-600">Loading...</span>}
              {salesError && <span className="text-xs text-red-600">Error: {salesError}</span>}
            </div>
            {sales.length > 0 && (
              <div className="text-xs">
                <strong>Total Sales:</strong> ₹{sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}<br/>
                <strong>Sample:</strong> {sales[0]?.invoiceNumber} - ₹{sales[0]?.total}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="mb-3 p-2 bg-green-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <strong className="text-xs">🍽️ Menu Items ({menuItems.length})</strong>
              {menuLoading && <span className="text-xs text-green-600">Loading...</span>}
              {menuError && <span className="text-xs text-red-600">Error: {menuError}</span>}
            </div>
            {menuItems.length > 0 && (
              <div className="text-xs">
                <strong>Available:</strong> {menuItems.filter(item => item.isAvailable).length}<br/>
                <strong>Sample:</strong> {menuItems[0]?.name} - ₹{menuItems[0]?.price}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="mb-3 p-2 bg-purple-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <strong className="text-xs">📂 Categories ({categories.length})</strong>
              {catLoading && <span className="text-xs text-purple-600">Loading...</span>}
              {catError && <span className="text-xs text-red-600">Error: {catError}</span>}
            </div>
            {categories.length > 0 && (
              <div className="text-xs">
                <strong>Active:</strong> {categories.filter(cat => cat.isActive).length}<br/>
                <strong>Sample:</strong> {categories[0]?.name}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="mb-3 p-2 bg-orange-50 rounded">
            <div className="flex justify-between items-center mb-1">
              <strong className="text-xs">📋 Orders ({orders.length})</strong>
              {ordersLoading && <span className="text-xs text-orange-600">Loading...</span>}
              {ordersError && <span className="text-xs text-red-600">Error: {ordersError}</span>}
            </div>
            {orders.length > 0 && (
              <div className="text-xs">
                <strong>Total Orders:</strong> {orders.length}<br/>
                <strong>Sample:</strong> {orders[0]?.orderNumber} - ₹{orders[0]?.totalAmount}
              </div>
            )}
          </div>

          {/* Locations */}
          <div className="mb-3 p-2 bg-yellow-50 rounded">
            <strong className="text-xs">📍 Locations ({locations.length})</strong>
            {locations.length > 0 && (
              <div className="text-xs mt-1">
                {locations.map(loc => (
                  <div key={loc.id}>• {loc.name} ({loc.id})</div>
                ))}
              </div>
            )}
          </div>

          {/* Franchises */}
          <div className="mb-3 p-2 bg-red-50 rounded">
            <strong className="text-xs">🏢 Franchises ({franchises.length})</strong>
            {franchises.length > 0 && (
              <div className="text-xs mt-1">
                {franchises.map(fr => (
                  <div key={fr.id}>• {fr.name} ({fr.id})</div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <button 
        onClick={() => (document.querySelector('.comprehensive-debug') as HTMLElement)?.remove()}
        className="mt-2 w-full px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
      >
        Close
      </button>
    </div>
  );
};

export default ComprehensiveDebug;