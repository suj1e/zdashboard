import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import App from './App';
import { resolveThemeBoot } from './lib/themeBoot';
import { safeStorage } from './lib/safeStorage';
import './globals.css';
import './themes/pixel.css';
import './themes/slate.css';

const rootEl = document.documentElement;

// 冷启动主题解析:legacy 迁移 + 非法值兜底,逻辑单源 themeBoot.ts。
// 首帧前的预置由 index.html head 内联脚本完成,此处为 bundle 侧正式写入。
const boot = resolveThemeBoot(safeStorage);
rootEl.dataset.mode = boot.mode;
rootEl.dataset.theme = boot.theme;
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
