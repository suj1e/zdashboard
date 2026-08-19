import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import App from './App';
import './globals.css';

const rootEl = document.documentElement;
let theme = localStorage.getItem('zdashboard-theme');
if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
rootEl.classList.toggle('dark', theme === 'dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster position="bottom-right" richColors />
  </React.StrictMode>
);
