import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const mode = document.documentElement.dataset.mode ?? 'dark';

  const toggle = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.mode = next;
    localStorage.setItem('zd-mode', next);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="切换明暗" title="切换明暗">
      {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
