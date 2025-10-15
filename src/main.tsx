import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { orderService } from './services/orderService';

// Make orderService available globally for debugging
(window as any).orderService = orderService;

// Simple error handling for preview environment
window.addEventListener('error', (event) => {
  // Suppress preview environment errors
  if (event.message && event.message.includes('502') && event.filename && event.filename.includes('space.z.ai')) {
    console.warn('🔸 Suppressing preview environment error:', event.message);
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Suppress network errors from preview environment
  if (event.reason && event.reason.message && event.reason.message.includes('502')) {
    console.warn('🔸 Suppressing preview environment network error:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);