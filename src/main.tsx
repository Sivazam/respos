import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { orderService } from './services/orderService';

// Make orderService available globally for debugging
(window as any).orderService = orderService;

// Remove any network status elements that might be injected
function removeNetworkStatusElements() {
  const selectors = [
    'div[data-network-status]',
    '.network-status-indicator',
    '.pwa-network-status',
    'div[style*="position: fixed"][style*="top: 0"][style*="left: 0"]',
    'div[style*="position: absolute"][style*="top: 0"][style*="left: 0"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const element = el as HTMLElement;
      if (element.textContent?.includes('4G') || 
          element.textContent?.includes('online') ||
          element.textContent?.includes('Online')) {
        element.remove();
      }
    });
  });
}

// Remove network status elements immediately and periodically.
// Store the interval id so it can be cleared on page unload.
removeNetworkStatusElements();
const networkStatusIntervalId: number = window.setInterval(removeNetworkStatusElements, 1000);
window.addEventListener('beforeunload', () => {
  window.clearInterval(networkStatusIntervalId);
});

// Simple error handling for preview environment
window.addEventListener('error', (event) => {
  // Log unhandled errors so we can diagnose ErrorBoundary triggers
  if (event.error) {
    console.error('[window.error]', event.message, event.error);
  }
  // Suppress preview environment errors
  if (event.message && event.message.includes('502') && event.filename && event.filename.includes('space.z.ai')) {
    console.warn('🔸 Suppressing preview environment error:', event.message);
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Always log so we can trace silent async errors
  console.error('[unhandledrejection]', event.reason);
  // Suppress network errors from preview environment
  if (event.reason && event.reason.message && event.reason.message.includes('502')) {
    console.warn('🔸 Suppressing preview environment network error:', event.reason.message);
    event.preventDefault();
    return false;
  }
  
  // Suppress cache errors that occur in background
  if (event.reason && 
      (event.reason.message?.includes('Cache.put()') || 
       event.reason.message?.includes('network error') ||
       event.reason.message?.includes('cache'))) {
    console.warn('🔸 Suppressing background cache error:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);