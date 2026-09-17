import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { I18nProvider } from './i18n/I18nProvider';

// Register service worker for Progressive Web App (PWA)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('PWA Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('PWA Service Worker registration failed:', err));
  });
} else if ('serviceWorker' in navigator) {
  // In development, also register but log status
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('PWA SW registered (Dev):', reg.scope))
      .catch((err) => console.error('PWA SW register error:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider><App /></I18nProvider>
  </StrictMode>,
);
