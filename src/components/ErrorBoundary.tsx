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

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      const isDev = import.meta.env.DEV;
      return (
        <div style={{ padding: '20px', backgroundColor: '#fff5f5', border: '1px solid #fcc', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ color: '#c00', marginTop: 0 }}>
            Something went wrong{this.props.name ? ` in ${this.props.name}` : ''}
          </h2>
          <p style={{ color: '#555' }}>
            This section couldn&apos;t be displayed. You can try again, or reload the page.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
