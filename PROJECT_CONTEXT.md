# ForkFlow POS - Project Context

## Overview

ForkFlow POS is a comprehensive point-of-sale system designed specifically for food retail businesses. Built with React, TypeScript, and Firebase, this web application provides a complete solution for managing sales, inventory, users, and reporting across multiple locations.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Icons**: Lucide React
- **Charts**: Chart.js with React-ChartJS-2

### Backend
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage (for product images)

### Deployment
- Progressive Web App (PWA) with service worker for offline capabilities
- Responsive design for desktop, tablet, and mobile devices

## Core Features

### User Management
- Role-based access control with four user roles:
  - **Super Admin**: Full system access, manages franchise settings and all locations
  - **Admin**: Manages store operations, inventory, and staff for assigned locations
  - **Manager**: Oversees daily operations, inventory, and salespersons for a specific location
  - **Salesperson**: Processes sales, manages orders, and handles returns
- User creation, activation/deactivation, and role assignment
- Location-specific user assignments

### Location Management
- Multi-location support
- Location-specific inventory, sales, and reporting
- Location selector for users with access to multiple locations

### Inventory Management
- Product catalog with categories
- Stock tracking and low stock alerts
- Vendor management
- Purchase order processing
- Stock adjustments (additions and reductions)

### Point of Sale (POS)
- Intuitive sales interface
- Product search and category filtering
- Cart management
- Multiple payment methods (cash, card, UPI)
- Receipt generation and printing
- GST calculation (CGST + SGST)

### Returns Processing
- Sales returns with refunds
- Purchase returns
- Return receipts
- Inventory auto-adjustment

### Reporting
- Sales reports with filtering by date range
- Inventory reports
- User activity tracking
- Export functionality (CSV)
- Accounting statements for tax filing

## Feature Configuration System

The system includes a unique feature configuration system that allows enabling/disabling specific features based on business needs:

### Store Configurations
- **Full**: All features enabled
- **Basic**: Core features with limited returns functionality
- **Simple**: Streamlined experience with minimal features

### Configurable Feature Categories
- **Returns**: Enable/disable returns processing
- **Inventory**: Control vendor management, purchase tracking, etc.
- **Reports**: Toggle advanced reporting features
- **Users**: Configure user management capabilities
- **Advanced**: Control multi-location support, invoice numbering, etc.

## Data Model

### Users
- UID (from Firebase Auth)
- Email
- Display Name
- Role (superadmin, admin, manager, salesperson)
- Location ID
- Active status
- Created/Updated timestamps

### Locations
- Name
- Store Name
- Address
- Contact information
- Active status
- Franchise ID

### Products
- Name
- Price
- Category ID
- Quantity (stock)
- Image URL
- Location ID

### Categories
- Name
- Description

### Vendors
- Name
- Contact information
- Address
- GST Number

### Sales
- Invoice Number
- Items (array of products with quantities)
- Subtotal, CGST, SGST, Total
- Payment Method
- Location ID
- Created By (User ID)
- Timestamp

### Returns
- Type (sale or purchase)
- Reference ID (sale or purchase ID)
- Items
- Reason
- Total
- Refund Method
- Location ID
- Created By (User ID)
- Timestamp

### Stock Updates
- Product ID
- Vendor ID
- Quantity (positive for additions, negative for reductions)
- Invoice Number
- Notes
- Location ID
- Timestamp

### Purchases
- Product ID
- Product Name
- Quantity
- Cost Price
- Vendor
- Invoice Number
- Notes
- Location ID
- Timestamp

## Application Flow

### Authentication Flow
1. User navigates to login page
2. User enters credentials
3. System authenticates and retrieves user role and permissions
4. User is redirected to appropriate dashboard based on role

### Sales Flow
1. Salesperson selects products from catalog
2. System adds products to cart and updates totals
3. Salesperson initiates checkout
4. Payment method is selected
5. Sale is processed and receipt is generated
6. Inventory is automatically updated

### Returns Flow
1. User searches for original sale
2. System displays sale details
3. User selects items to return and provides reason
4. Refund method is selected
5. Return is processed and receipt is generated
6. Inventory is automatically updated

### Inventory Management Flow
1. Admin/Manager views current inventory
2. Stock updates are processed (additions from purchases, reductions from sales/returns)
3. Low stock alerts are generated
4. Purchase orders are created for restocking

## Code Structure

### Contexts
The application uses React Context API for state management:
- `AuthContext`: User authentication and role management
- `FranchiseContext`: Franchise settings and configuration
- `LocationContext`: Location management and selection
- `CategoryContext`: Product categories
- `ProductContext`: Product catalog and inventory
- `VendorContext`: Supplier management
- `StockContext`: Stock updates and adjustments
- `CartContext`: Current sale cart management
- `SalesContext`: Sales history and processing
- `PurchaseContext`: Purchase orders
- `ReturnContext`: Returns processing

### Components
Organized by feature area:
- `auth`: Login, registration, and authentication
- `inventory`: Product, category, and stock management
- `pos`: Point of sale components
- `returns`: Return processing
- `ui`: Reusable UI components
- `layout`: Page layouts and navigation

### Pages
Organized by user role:
- `auth`: Login and registration
- `dashboards`: Role-specific dashboards
- `superadmin`: Super admin specific pages
- `admin`: Admin specific pages
- `manager`: Manager specific pages
- `pos`: Point of sale pages
- `inventory`: Inventory management
- `reports`: Reporting and analytics

## Feature Toggles System

The application includes a sophisticated feature toggle system that allows disabling/enabling features without code changes:

- Feature toggles are defined in `src/config/features.ts`
- The `useFeatures` hook provides access to feature status
- `FeatureGuard` component conditionally renders UI based on feature status
- Feature configuration can be changed per store type (full, basic, simple)

## Customization Options

### Branding
- Business name
- Receipt customization
- Color themes

### Subscription Plans
- Basic, Premium, and Enterprise tiers
- Feature availability based on subscription level
- User and location limits

### Store Configuration
- Tax rates
- Payment methods
- Receipt format
- Feature enablement

## Deployment and Environment

The application is designed as a Progressive Web App (PWA) that can be:
- Accessed from any modern web browser
- Installed on desktop and mobile devices
- Used offline with limited functionality
- Automatically updated when new versions are released

## Security Considerations

- Role-based access control
- Location-specific data isolation
- Firebase Authentication for secure user management
- Data validation on both client and server
- Activity logging for audit trails

## Future Development Roadmap

Potential areas for expansion:
- Customer loyalty program
- E-commerce integration
- Advanced analytics and AI-powered insights
- Kitchen display system for food preparation
- Mobile app for inventory scanning
- Third-party integrations (accounting, delivery services)