import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CartItem } from '../types';
import { useMenuItems } from './MenuItemContext';
import { useAuth } from './AuthContext';
import { useLocations } from './LocationContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  cgstRate: number;
  sgstRate: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cgstRate, setCgstRate] = useState(0); // Default 0% CGST
  const [sgstRate, setSgstRate] = useState(0); // Default 0% SGST
  const { menuItems } = useMenuItems();
  const { currentLocation } = useLocations();
  const { currentUser } = useAuth();
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pos-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('pos-cart', JSON.stringify(items));
    } else {
      localStorage.removeItem('pos-cart');
    }
  }, [items]);
  
  // Load GST settings from location
  useEffect(() => {
    const loadGstSettings = async () => {
      const locationId = currentLocation?.id || currentUser?.locationId;
      if (locationId) {
        try {
          const settingsDoc = await getDoc(doc(db, 'locationSettings', locationId));
          if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            console.log('Raw location settings:', settings);
            // Check both possible structures for GST rates
            const cgst = settings.tax?.cgst ?? settings.operations?.taxRates?.cgst ?? 0;
            const sgst = settings.tax?.sgst ?? settings.operations?.taxRates?.sgst ?? 0;
            setCgstRate(cgst / 100); // Convert percentage to decimal
            setSgstRate(sgst / 100); // Convert percentage to decimal
            console.log('Loaded GST settings:', { cgst, sgst, cgstRate: cgst / 100, sgstRate: sgst / 100 });
          }
        } catch (error) {
          console.error('Error loading GST settings:', error);
        }
      }
    };
    
    loadGstSettings();
  }, [currentLocation?.id, currentUser?.uid, currentUser?.role]);

  const addItem = (cartItem: Omit<CartItem, 'id' | 'quantity'>) => {
    // Check if the menu item exists and is available
    const menuItem = menuItems.find(item => item.id === cartItem.menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      return;
    }

    // Check if menu item belongs to current location (if location is set)
    if (currentUser?.locationId && menuItem.locationId && menuItem.locationId !== currentUser.locationId) {
      console.error('Menu item does not belong to current location');
      return;
    }

    setItems(currentItems => {
      // Find existing item with same menuItemId, modifications, and notes
      const existingItem = currentItems.find(item => 
        item.menuItemId === cartItem.menuItemId &&
        JSON.stringify(item.modifications) === JSON.stringify(cartItem.modifications) &&
        item.notes === cartItem.notes
      );
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...currentItems, {
        id: uuidv4(),
        menuItemId: cartItem.menuItemId,
        name: cartItem.name,
        price: cartItem.price,
        quantity: 1,
        modifications: cartItem.modifications || [],
        notes: cartItem.notes || ''
      }];
    });
  };

  const removeItem = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('pos-cart');
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cgst = subtotal * cgstRate;
  const sgst = subtotal * sgstRate;
  const total = subtotal + cgst + sgst;

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    cgst,
    sgst,
    total,
    cgstRate,
    sgstRate
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};