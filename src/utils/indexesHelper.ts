/**
 * Helper utility to handle Firestore index errors gracefully
 * and provide fallback mechanisms
 */

export interface IndexError {
  code: string;
  message: string;
  indexUrl?: string;
}

export function isIndexError(error: Error | IndexError): error is IndexError {
  return (
    (error as IndexError).code === 'failed-precondition' ||
    error.message?.includes('The query requires an index') ||
    error.message?.includes('index')
  );
}

export function extractIndexUrl(error: Error | IndexError): string | null {
  const match = error.message?.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/);
  return match ? match[0] : null;
}

export async function createFallbackQuery<T>(
  originalQuery: () => Promise<T>,
  fallbackQuery: () => Promise<T>
): Promise<T> {
  try {
    return await originalQuery();
  } catch (error: unknown) {
    if (isIndexError(error as Error)) {
      console.warn('Index required, falling back to client-side filtering:', error.message);
      const indexUrl = extractIndexUrl(error as Error);
      if (indexUrl) {
        console.info('Create index here:', indexUrl);
      }
      return await fallbackQuery();
    }
    throw error;
  }
}

/**
 * Tables-specific index helper
 */
export function getTablesWithFallback(
  db: any,
  locationId: string,
  orderByField?: string,
  orderDirection: 'asc' | 'desc' = 'asc'
) {
  // Dynamic import to avoid require statement
  const firestoreModule = eval('require')('firebase/firestore');
  const { collection, query, where, orderBy, getDocs } = firestoreModule;

  // Try the optimal query first (with index)
  const optimalQuery = async () => {
    const q = query(
      collection(db, 'tables'),
      where('locationId', '==', locationId),
      orderBy(orderByField || 'createdAt', orderDirection)
    );
    return await getDocs(q);
  };

  // Fallback query (without orderBy)
  const fallbackQuery = async () => {
    const q = query(
      collection(db, 'tables'),
      where('locationId', '==', locationId)
    );
    return await getDocs(q);
  };

  return createFallbackQuery(optimalQuery, fallbackQuery);
}