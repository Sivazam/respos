'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface OrderCountContextType {
  totalOrders: number;
  setTotalOrders: (count: number) => void;
}

const OrderCountContext = createContext<OrderCountContextType | undefined>(undefined);

export function OrderCountProvider({ children }: { children: ReactNode }) {
  const [totalOrders, setTotalOrders] = useState(0);

  return (
    <OrderCountContext.Provider value={{ totalOrders, setTotalOrders }}>
      {children}
    </OrderCountContext.Provider>
  );
}

export function useOrderCount() {
  const context = useContext(OrderCountContext);
  if (context === undefined) {
    throw new Error('useOrderCount must be used within an OrderCountProvider');
  }
  return context;
}