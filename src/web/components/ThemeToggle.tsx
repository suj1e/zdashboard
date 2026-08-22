import { Button } from './ui/button';
import { useIcons } from '../lib/icons.js';

export function ThemeToggle() {
  const mode = document.documentElement.dataset.mode ?? 'dark';
  const { icon } = useIcons();

  const toggle = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.mode = next;
    localStorage.setItem('zd-mode', next);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="切换明暗" title="切换明暗">
      {mode === 'dark' ? icon('sun', 'h-4 w-4') : icon('moon', 'h-4 w-4')}
    </Button>
  );
}
