import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';

const rootEl = document.documentElement;
let theme = localStorage.getItem('zview-theme');
if (!theme) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
rootEl.classList.toggle('dark', theme === 'dark');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
