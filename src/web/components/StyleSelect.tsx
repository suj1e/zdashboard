import { Check, Palette } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { STYLES } from '../lib/themes';
import { useState } from 'react';

export function StyleSelect() {
  const [current, setCurrent] = useState(() => document.documentElement.dataset.theme ?? 'default');

  const setStyle = (id: string) => {
    document.documentElement.dataset.theme = id;
    localStorage.setItem('zd-theme', id);
    setCurrent(id);
    document.documentElement.dispatchEvent(new CustomEvent('themechange'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切换风格" title="切换风格">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {STYLES.map((s) => {
          const active = current === s.id;
          return (
            <DropdownMenuItem key={s.id} onClick={() => setStyle(s.id)} className="flex items-center gap-2.5 cursor-pointer">
              <span className="flex gap-0.5" aria-hidden="true">
                {s.swatch.map((c, i) => (
                  <span key={i} className="h-3 w-3 rounded-sm inline-block border border-border/50" style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className="flex-1 text-sm">{s.label}</span>
              {active && <Check className="h-3.5 w-3.5 text-foreground" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
