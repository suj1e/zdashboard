import { Home } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';

export function IconRail({ active, onSelect, plugins }: {
  active: string | null; onSelect: (mode: string | null) => void; plugins: Array<{ mode: string; label: string; icon: string }>;
}) {
  return (
    <nav className="w-12 flex-none border-r bg-background flex flex-col items-center py-2 gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onSelect(null)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all ${active === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:scale-105'}`}
            aria-current={active === null ? 'page' : undefined}
          >
            <Home className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">首页</TooltipContent>
      </Tooltip>
      {plugins.map((p) => (
        <Tooltip key={p.mode}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelect(p.mode)}
              aria-current={active === p.mode ? 'page' : undefined}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all ${active === p.mode ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:scale-105'}`}
            >
              <span>{p.icon}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{p.label}</TooltipContent>
        </Tooltip>
      ))}
    </nav>
  );
}
