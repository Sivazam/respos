/**
 * safeStorage — wraps window.localStorage with:
 *  - try/catch on every operation (no throws into callers)
 *  - quota detection (logs once and falls through to in-memory fallback)
 *  - private-mode / disabled-storage fallback (in-memory Map)
 *  - cross-tab change notifications via BroadcastChannel + storage event
 *
 * Drop-in replacement for the small subset of localStorage we use:
 *   getItem, setItem, removeItem, clear
 *
 * Plus optional helpers: getJSON / setJSON / subscribe(key, handler).
 */

type Listener = (newValue: string | null) => void;

const memoryStore = new Map<string, string>();
let usingMemoryFallback = false;

function probeLocalStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probeKey = '__safeStorage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

const localStorageAvailable = probeLocalStorage();
if (!localStorageAvailable) {
  usingMemoryFallback = true;
  // eslint-disable-next-line no-console
  console.warn('[safeStorage] localStorage unavailable, using in-memory fallback');
}

let channel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('safe-storage');
  }
} catch {
  channel = null;
}

const listeners = new Map<string, Set<Listener>>();

function notify(key: string, newValue: string | null) {
  const set = listeners.get(key);
  if (!set) return;
  set.forEach((fn) => {
    try { fn(newValue); } catch (err) { console.error('[safeStorage] listener error', err); }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key) notify(e.key, e.newValue);
  });
}
if (channel) {
  channel.addEventListener('message', (e) => {
    if (e?.data?.key) notify(e.data.key as string, e.data.newValue ?? null);
  });
}

function broadcast(key: string, newValue: string | null) {
  if (!channel) return;
  try { channel.postMessage({ key, newValue }); } catch { /* ignore */ }
}

let quotaWarned = false;

export const safeStorage = {
  getItem(key: string): string | null {
    if (usingMemoryFallback) return memoryStore.get(key) ?? null;
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.warn('[safeStorage] getItem failed for', key, err);
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): boolean {
    if (usingMemoryFallback) {
      memoryStore.set(key, value);
      notify(key, value);
      broadcast(key, value);
      return true;
    }
    try {
      window.localStorage.setItem(key, value);
      memoryStore.delete(key);
      notify(key, value);
      broadcast(key, value);
      return true;
    } catch (err: unknown) {
      const isQuota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014);
      if (isQuota && !quotaWarned) {
        quotaWarned = true;
        console.warn('[safeStorage] quota exceeded, falling back to memory for', key);
      } else if (!isQuota) {
        console.warn('[safeStorage] setItem failed for', key, err);
      }
      memoryStore.set(key, value);
      notify(key, value);
      broadcast(key, value);
      return false;
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    if (!usingMemoryFallback) {
      try { window.localStorage.removeItem(key); } catch (err) {
        console.warn('[safeStorage] removeItem failed for', key, err);
      }
    }
    notify(key, null);
    broadcast(key, null);
  },

  clear(): void {
    memoryStore.clear();
    if (!usingMemoryFallback) {
      try { window.localStorage.clear(); } catch (err) {
        console.warn('[safeStorage] clear failed', err);
      }
    }
  },

  /** Read + JSON.parse with a safe default. */
  getJSON<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn('[safeStorage] getJSON parse failed for', key, err);
      return fallback;
    }
  },

  /** JSON.stringify + setItem; returns false on serialize/quota failure. */
  setJSON(key: string, value: unknown): boolean {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (err) {
      console.warn('[safeStorage] setJSON serialize failed for', key, err);
      return false;
    }
    return this.setItem(key, serialized);
  },

  /** Subscribe to changes for a specific key (in-tab + cross-tab). Returns unsubscribe. */
  subscribe(key: string, handler: Listener): () => void {
    let set = listeners.get(key);
    if (!set) { set = new Set(); listeners.set(key, set); }
    set.add(handler);
    return () => {
      const s = listeners.get(key);
      if (s) { s.delete(handler); if (s.size === 0) listeners.delete(key); }
    };
  },

  /** True if storage is backed by an in-memory Map (no persistence). */
  isMemoryFallback(): boolean {
    return usingMemoryFallback;
  },
};
