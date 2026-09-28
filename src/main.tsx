import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from '@/components/ErrorBoundary';
import i18n from './i18n';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Modern PWA Registration with auto-update
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
