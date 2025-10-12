import React from 'react';
import { RestaurantProvider } from '../../contexts/RestaurantContext';
import { TableProvider } from '../../contexts/TableContext';
import { OrderProvider } from '../../contexts/OrderContext';
import { TemporaryOrderProvider } from '../../contexts/TemporaryOrderContext';
import { TemporaryOrdersDisplayProvider } from '../../contexts/TemporaryOrdersDisplayContext';
import { EnhancedOrderProvider } from '../../contexts/EnhancedOrderContext';
import { RealtimeTableProvider } from '../../contexts/RealtimeTableContext';
import { CategoryProvider } from '../../contexts/CategoryContext';
import { ProductProvider } from '../../contexts/ProductContext';
import { MenuItemProvider } from '../../contexts/MenuItemContext';
import { StockProvider } from '../../contexts/StockContext';
import { CartProvider } from '../../contexts/CartContext';
import { SalesProvider } from '../../contexts/SalesContext';
import { PurchaseProvider } from '../../contexts/PurchaseContext';
import { ReturnProvider } from '../../contexts/ReturnContext';
import { LocationProvider } from '../../contexts/LocationContext';

interface FullAppProvidersProps {
  children: React.ReactNode;
}

const FullAppProviders: React.FC<FullAppProvidersProps> = ({ children }) => {
  return (
    <RestaurantProvider>
      <LocationProvider>
        <RealtimeTableProvider>
          <TableProvider>
            <OrderProvider>
              <EnhancedOrderProvider>
                <TemporaryOrderProvider>
                  <TemporaryOrdersDisplayProvider>
                    <CategoryProvider>
                      <ProductProvider>
                        <MenuItemProvider>
                          <StockProvider>
                            <CartProvider>
                              <SalesProvider>
                                <PurchaseProvider>
                                  <ReturnProvider>
                                    {children}
                                  </ReturnProvider>
                                </PurchaseProvider>
                              </SalesProvider>
                            </CartProvider>
                          </StockProvider>
                        </MenuItemProvider>
                      </ProductProvider>
                    </CategoryProvider>
                  </TemporaryOrdersDisplayProvider>
                </TemporaryOrderProvider>
              </EnhancedOrderProvider>
            </OrderProvider>
          </TableProvider>
        </RealtimeTableProvider>
      </LocationProvider>
    </RestaurantProvider>
  );
};

export default FullAppProviders;