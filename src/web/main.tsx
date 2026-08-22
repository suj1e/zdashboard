import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import App from './App';
import './globals.css';
import './themes/pixel.css';
import './themes/slate.css';

const rootEl = document.documentElement;

// mode: zd-mode (new) or legacy zdashboard-theme → map to data-mode="dark"/"light"
let mode = localStorage.getItem('zd-mode');
if (!mode) {
  const legacy = localStorage.getItem('zdashboard-theme');
  mode = legacy === 'light' ? 'light' : 'dark'; // default dark
  localStorage.setItem('zd-mode', mode);
  localStorage.removeItem('zdashboard-theme');
}
rootEl.dataset.mode = mode;

// style: zd-theme → data-theme="default"/"pixel"/"nord"
let theme = localStorage.getItem('zd-theme') ?? 'default';
rootEl.dataset.theme = theme;
rootEl.dispatchEvent(new CustomEvent('themechange'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  </React.StrictMode>
);
