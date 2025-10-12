import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { orderService } from './services/orderService';

// Make orderService available globally for debugging
(window as any).orderService = orderService;

// Intercept fetch to prevent requests to non-existent backend endpoints
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  
  // Block requests to preview environment backend
  if (typeof url === 'string' && url.includes('space.z.ai') && url.includes('/manager/')) {
    console.warn('🔸 Blocking request to non-existent backend:', url);
    throw new Error('Backend requests are not supported in this frontend-only application');
  }
  
  // Block requests to localhost backend endpoints
  if (typeof url === 'string' && url.includes('/manager/pending-orders') && !url.includes('firebase')) {
    console.warn('🔸 Blocking request to backend endpoint:', url);
    throw new Error('Backend requests are not supported in this frontend-only application');
  }
  
  return originalFetch.apply(window, args);
};

// Intercept XMLHttpRequest to prevent requests to non-existent backend endpoints
const originalXHR = window.XMLHttpRequest;
const XHROverride = function(this: XMLHttpRequest) {
  const xhr = new originalXHR();
  const originalOpen = xhr.open;
  
  xhr.open = function(method: string, url: string | URL, ...args: any[]) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    
    // Block requests to preview environment backend
    if (urlStr.includes('space.z.ai') && urlStr.includes('/manager/')) {
      console.warn('🔸 Blocking XMLHttpRequest to non-existent backend:', urlStr);
      throw new Error('Backend requests are not supported in this frontend-only application');
    }
    
    // Block requests to localhost backend endpoints
    if (urlStr.includes('/manager/pending-orders') && !urlStr.includes('firebase')) {
      console.warn('🔸 Blocking XMLHttpRequest to backend endpoint:', urlStr);
      throw new Error('Backend requests are not supported in this frontend-only application');
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  return xhr;
} as any;

// Copy prototype to maintain instanceof checks
XHROverride.prototype = originalXHR.prototype;
XHROverride.UNSENT = originalXHR.UNSENT;
XHROverride.OPENED = originalXHR.OPENED;
XHROverride.HEADERS_RECEIVED = originalXHR.HEADERS_RECEIVED;
XHROverride.LOADING = originalXHR.LOADING;
XHROverride.DONE = originalXHR.DONE;

window.XMLHttpRequest = XHROverride;

// Add global error handler to suppress preview environment errors
window.addEventListener('error', (event) => {
  // Suppress 502 errors from preview environment
  if (event.message && event.message.includes('502') && event.filename && event.filename.includes('space.z.ai')) {
    console.warn('🔸 Suppressing preview environment 502 error:', event.message);
    event.preventDefault();
    return false;
  }
  
  // Suppress fetch errors from blocked requests
  if (event.message && event.message.includes('Backend requests are not supported')) {
    console.warn('🔸 Suppressing blocked backend request error:', event.message);
    event.preventDefault();
    return false;
  }
});

// Add global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Suppress network errors from preview environment
  if (event.reason && event.reason.message && event.reason.message.includes('502')) {
    console.warn('🔸 Suppressing preview environment network error:', event.reason.message);
    event.preventDefault();
    return false;
  }
  
  // Suppress fetch errors from blocked requests
  if (event.reason && event.reason.message && event.reason.message.includes('Backend requests are not supported')) {
    console.warn('🔸 Suppressing blocked backend request error:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);