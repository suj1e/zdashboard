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
            className={`w-9 h-9 flex items-center justify-center rounded-md text-sm transition-colors ${active === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
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
              className={`w-9 h-9 flex items-center justify-center rounded-md text-base transition-colors ${active === p.mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
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
