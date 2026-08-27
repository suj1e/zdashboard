import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { useIcons, useModeIcon } from '../lib/icons.js';

export function IconRail({ active, onSelect, plugins }: {
  active: string | null; onSelect: (mode: string | null) => void; plugins: Array<{ mode: string; label: string; icon: string }>;
}) {
  const { icon } = useIcons();
  return (
    <nav className="w-[var(--icon-rail-w)] flex-none border-r bg-background flex flex-col items-center py-2 gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onSelect(null)}
            className={`relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-lg)] text-sm transition-all ${active === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:scale-105'}`}
            aria-current={active === null ? 'page' : undefined}
          >
            {icon('rail:home', 'h-4 w-4')}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">首页</TooltipContent>
      </Tooltip>
      {plugins.map((p) => (
        <RailButton key={p.mode} plugin={p} active={active === p.mode} onSelect={onSelect} />
      ))}
    </nav>
  );
}

function RailButton({ plugin, active, onSelect }: {
  plugin: { mode: string; label: string; icon: string }; active: boolean; onSelect: (mode: string | null) => void;
}) {
  const themed = useModeIcon(plugin.mode, 'h-4 w-4');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onSelect(plugin.mode)}
          aria-current={active ? 'page' : undefined}
          className={`relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-lg)] transition-all ${active ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:scale-105'}`}
        >
          {themed ?? (
            <span className="text-base leading-none">{plugin.icon}</span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{plugin.label}</TooltipContent>
    </Tooltip>
  );
}
