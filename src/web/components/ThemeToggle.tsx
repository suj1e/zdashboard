import { useState } from 'react';
import { Button } from './ui/button';
import { useIcons } from '../lib/icons.js';
import { safeSetItem } from '../lib/safeStorage.js';

export function ThemeToggle() {
  // 状态源是 React state(dataset 仅作初值,main.tsx 启动时已写入);
  // 避免读 DOM 作状态导致连点基于陈旧值计算 next。
  const [mode, setMode] = useState<'dark' | 'light'>(() =>
    document.documentElement.dataset.mode === 'light' ? 'light' : 'dark',
  );
  const { icon } = useIcons();

  const toggle = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    document.documentElement.dataset.mode = next;
    safeSetItem('zd-mode', next);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="切换明暗" title="切换明暗">
      {mode === 'dark' ? icon('sun', 'h-4 w-4') : icon('moon', 'h-4 w-4')}
    </Button>
  );
}
