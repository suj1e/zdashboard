import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('zview-theme', isDark ? 'dark' : 'light');
  };
  const isDark = document.documentElement.classList.contains('dark');
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label="切换主题" title="切换主题">{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>;
}
