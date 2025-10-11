import { useAuth } from './AuthContext';

/**
 * Base context utilities for role-based data filtering
 */

export interface DataFilter {
  where?: { field: string; operator: string; value: any }[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

export function getDataFilter(user: any, currentLocation: any): DataFilter {
  // Superadmin - sees all data
  if (user?.role === 'superadmin') {
    return {
      orderBy: { field: 'createdAt', direction: 'desc' }
    };
  }

  // Admin/Owner - sees all data in their franchise
  if (user?.role === 'admin' || user?.role === 'owner') {
    const filter: DataFilter = {
      where: [
        { field: 'franchiseId', operator: '==', value: user.franchiseId }
      ],
      orderBy: { field: 'createdAt', direction: 'desc' }
    };

    // If a specific location is selected, filter by that too
    if (currentLocation) {
      filter.where?.push({ field: 'locationId', operator: '==', value: currentLocation.id });
    }

    return filter;
  }

  // Manager - sees data from their assigned locations
  if (user?.role === 'manager') {
    const filter: DataFilter = {
      where: [
        { field: 'franchiseId', operator: '==', value: user.franchiseId }
      ],
      orderBy: { field: 'createdAt', direction: 'desc' }
    };

    // Manager can have multiple locations, but typically has one primary location
    if (currentLocation) {
      filter.where?.push({ field: 'locationId', operator: '==', value: currentLocation.id });
    } else if (user.locationId) {
      filter.where?.push({ field: 'locationId', operator: '==', value: user.locationId });
    }

    return filter;
  }

  // Staff - sees data from their assigned location only
  if (user?.role === 'staff') {
    const filter: DataFilter = {
      where: [
        { field: 'franchiseId', operator: '==', value: user.franchiseId }
      ],
      orderBy: { field: 'createdAt', direction: 'desc' }
    };

    // Staff always has exactly one location
    if (user.locationId) {
      filter.where?.push({ field: 'locationId', operator: '==', value: user.locationId });
    }

    return filter;
  }

  // Default case - no user or unknown role
  return {
    orderBy: { field: 'createdAt', direction: 'desc' }
  };
}

export function canUserAccessLocation(user: any, locationId: string): boolean {
  if (!user) return false;

  // Superadmin can access all locations
  if (user.role === 'superadmin') return true;

  // Admin/Owner can access any location in their franchise
  if (user.role === 'admin' || user.role === 'owner') {
    return true; // We'll check franchise membership at query level
  }

  // Manager can access their assigned locations
  if (user.role === 'manager') {
    return user.locationId === locationId; // For now, single location
  }

  // Staff can only access their assigned location
  if (user.role === 'staff') {
    return user.locationId === locationId;
  }

  return false;
}

export function getAccessibleLocations(user: any, allLocations: any[]): any[] {
  if (!user) return [];

  // Superadmin sees all locations
  if (user.role === 'superadmin') {
    return allLocations;
  }

  // Admin/Owner sees all locations in their franchise
  if (user.role === 'admin' || user.role === 'owner') {
    return allLocations.filter(location => location.franchiseId === user.franchiseId);
  }

  // Manager sees their assigned locations
  if (user.role === 'manager') {
    return allLocations.filter(location => location.id === user.locationId);
  }

  // Staff sees only their assigned location
  if (user.role === 'staff') {
    return allLocations.filter(location => location.id === user.locationId);
  }

  return [];
}

export function hasNoLocationAssigned(user: any): boolean {
  if (!user) return true;
  
  // Superadmin doesn't need location assignment
  if (user.role === 'superadmin') return false;
  
  // Admin/Owner should have franchise assignment
  if (user.role === 'admin' || user.role === 'owner') {
    return !user.franchiseId;
  }
  
  // Manager and Staff should have location assignment
  return !user.locationId;
}