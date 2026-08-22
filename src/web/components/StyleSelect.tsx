import { Check } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { STYLES } from '../lib/themes';

export function StyleSelect() {
  const current = document.documentElement.dataset.theme ?? 'default';

  const setStyle = (id: string) => {
    document.documentElement.dataset.theme = id;
    localStorage.setItem('zd-theme', id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="切换风格" title="切换风格">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            <circle cx="7.5" cy="10" r="1.5" />
            <circle cx="12" cy="7" r="1.5" />
            <circle cx="16.5" cy="10" r="1.5" />
          </svg>
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
