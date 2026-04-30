import { useAuth } from './AuthContext';
import type { User, Location } from '../types';

/**
 * Base context utilities for role-based data filtering
 */

export interface DataFilter {
  where?: { field: string; operator: string; value: unknown }[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

export function getDataFilter(
  user: User | null | undefined,
  currentLocation: Location | null | undefined
): DataFilter {
  if (!user) {
    return { orderBy: { field: 'createdAt', direction: 'desc' } };
  }

  // Superadmin - sees all data
  if (user.role === 'superadmin') {
    return {
      orderBy: { field: 'createdAt', direction: 'desc' }
    };
  }

  // Admin/Owner - sees all data in their franchise
  if (user.role === 'admin' || user.role === 'owner') {
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
  if (user.role === 'manager') {
    const filter: DataFilter = {
      where: [
        { field: 'franchiseId', operator: '==', value: user.franchiseId }
      ],
      orderBy: { field: 'createdAt', direction: 'desc' }
    };

    if (currentLocation) {
      filter.where?.push({ field: 'locationId', operator: '==', value: currentLocation.id });
    } else if (user.locationId) {
      filter.where?.push({ field: 'locationId', operator: '==', value: user.locationId });
    }

    return filter;
  }

  // Staff - sees data from their assigned location only
  if (user.role === 'staff') {
    const filter: DataFilter = {
      where: [
        { field: 'franchiseId', operator: '==', value: user.franchiseId }
      ],
      orderBy: { field: 'createdAt', direction: 'desc' }
    };

    if (user.locationId) {
      filter.where?.push({ field: 'locationId', operator: '==', value: user.locationId });
    }

    return filter;
  }

  // Default case - unknown role
  return {
    orderBy: { field: 'createdAt', direction: 'desc' }
  };
}

export function canUserAccessLocation(
  user: User | null | undefined,
  locationId: string | null | undefined
): boolean {
  if (!user || !locationId) return false;

  if (user.role === 'superadmin') return true;

  if (user.role === 'admin' || user.role === 'owner') {
    return true; // franchise membership enforced at query/rules level
  }

  const accessibleIds = [
    ...(Array.isArray(user.locationIds) ? user.locationIds : []),
    ...(user.locationId ? [user.locationId] : []),
  ];

  if (user.role === 'manager' || user.role === 'staff') {
    return accessibleIds.includes(locationId);
  }

  return false;
}

export function getAccessibleLocations(
  user: User | null | undefined,
  allLocations: Location[] | null | undefined
): Location[] {
  if (!user || !Array.isArray(allLocations)) return [];

  if (user.role === 'superadmin') {
    return allLocations;
  }

  if (user.role === 'admin' || user.role === 'owner') {
    return allLocations.filter(location => location.franchiseId === user.franchiseId);
  }

  const accessibleIds = [
    ...(Array.isArray(user.locationIds) ? user.locationIds : []),
    ...(user.locationId ? [user.locationId] : []),
  ];

  if (user.role === 'manager' || user.role === 'staff') {
    return allLocations.filter(location => accessibleIds.includes(location.id));
  }

  return [];
}

export function hasNoLocationAssigned(user: User | null | undefined): boolean {
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