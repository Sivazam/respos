import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error UI (e.g., "Manager dashboard"). */
  name?: string;
  /** Optional custom fallback render override. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}] caught:`, error, errorInfo);
    this.setState({ error, errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /** Detect storage/quota related errors that brick the app on startup. */
  isStorageError = (error: Error): boolean => {
    const msg = (error.message || error.toString()).toLowerCase();
    const name = (error.name || '').toLowerCase();
    return (
      name.includes('quotaexceeded') ||
      msg.includes('quota') ||
      msg.includes('indexeddb') ||
      msg.includes('storage') ||
      msg.includes('disk') ||
      msg.includes('idb') ||
      msg.includes('transaction was aborted')
    );
  };

  /** Nuclear option: wipe all local storage, caches, and service workers. */
  handleClearStorage = async () => {
    try {
      // 1. Delete all IndexedDB databases
      if (window.indexedDB && typeof (window.indexedDB as any).databases === 'function') {
        const databases = await (window.indexedDB as any).databases();
        for (const db of databases) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        }
      }

      // 2. Clear Cache Storage (Service Worker caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 3. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 4. Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error during storage cleanup:', e);
    }

    // 5. Hard reload to /login regardless of cleanup success
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      const isDev = import.meta.env.DEV;
      const isStorage = this.isStorageError(this.state.error);

      return (
        <div style={{ padding: '20px', backgroundColor: isStorage ? '#fef2f2' : '#fff5f5', border: `1px solid ${isStorage ? '#f87171' : '#fcc'}`, borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ color: '#c00', marginTop: 0 }}>
            {isStorage
              ? '⚠️ Storage Full — App Cannot Start'
              : `Something went wrong${this.props.name ? ` in ${this.props.name}` : ''}`
            }
          </h2>
          <p style={{ color: '#555' }}>
            {isStorage
              ? 'The app ran out of local storage space. Tap the button below to clear cached data and restart. You will need to log in again.'
              : "This section couldn\u0027t be displayed. You can try again, or reload the page."
            }
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {isStorage ? (
              <button
                type="button"
                onClick={this.handleClearStorage}
                style={{ padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
              >
                🗑️ Clear Storage & Restart
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={this.reset}
                  style={{ padding: '8px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ padding: '8px 14px', background: '#e5e7eb', color: '#111', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Reload page
                </button>
              </>
            )}
            {/* Always show the clear storage option as a secondary action */}
            {!isStorage && (
              <button
                type="button"
                onClick={this.handleClearStorage}
                style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                Clear Storage & Restart
              </button>
            )}
          </div>
          {/* Always show the error message so prod issues can be diagnosed */}
          <p style={{ color: '#7a1a1a', fontFamily: 'monospace', fontSize: '12px', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #fcc', wordBreak: 'break-word' }}>
            {this.state.error.message || this.state.error.toString()}
          </p>
          {isDev && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error details (dev only)</summary>
              <p><strong>Error:</strong> {this.state.error.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
