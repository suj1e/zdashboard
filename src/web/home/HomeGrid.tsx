import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import type { WebPlugin } from '../lib/plugins';
import { useModeIcon } from '../lib/icons.js';
import { Skeleton } from '../kit/index.js';

/** 卡片所需的最小结构(props 面收窄) */
export type HomeCardItem = Pick<WebPlugin, 'mode' | 'label' | 'icon'> & Partial<Pick<WebPlugin, 'description' | 'external'>>;

/** 首页探测位(openspec/docs/just) */
export interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean }

const DETECT_ITEMS: { key: keyof Detects; label: string }[] = [
  { key: 'hasOpenspec', label: 'openspec' },
  { key: 'hasDocs', label: 'docs' },
  { key: 'hasJust', label: 'just' },
];

export function HomeGrid({ plugins, detect, onSelect }: {
  plugins: HomeCardItem[]; detect: Detects; onSelect: (mode: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.length > 0 ? (
          plugins.map((p) => <GridCard key={p.mode} plugin={p} onSelect={onSelect} />)
        ) : (
          // 注册表未就绪:3 张骨架卡片占位,避免空网格
          Array.from({ length: 3 }, (_, i) => <HomeCardSkeleton key={i} />)
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <span className="mr-1">探测</span>
        {DETECT_ITEMS.map(d => (
          <span key={d.key} className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 h-[var(--chip-h)] font-mono ${detect[d.key] ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted/40 text-muted-foreground/70'}`}>
            <span className={`h-1.5 w-1.5 rounded-[var(--radius-full)] ${detect[d.key] ? 'bg-success' : 'bg-muted-foreground/40'}`} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 卡片骨架:与 GridCard 同构(图标位 + 标题/描述两行),仅供未就绪占位 */
function HomeCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-xl)] border bg-card shadow-sm" aria-hidden data-slot="home-card-skeleton">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="w-1/2" />
            <Skeleton className="w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GridCard({ plugin, onSelect }: { plugin: HomeCardItem; onSelect: (mode: string) => void }) {
  const themed = useModeIcon(plugin.mode, 'h-[18px] w-[18px]');
  return (
    <button
      onClick={() => onSelect(plugin.mode)}
      className="text-left group rounded-[var(--radius-lg)]"
    >
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-muted-foreground/30">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-muted leading-none group-hover:bg-primary/10 transition-colors">
              {themed ?? plugin.icon}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <span className="truncate">{plugin.label}</span>
                {plugin.external && <span className="flex-none text-xs px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-muted-foreground border">外部</span>}
              </CardTitle>
              <CardDescription className="truncate">{plugin.description ?? plugin.mode}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </button>
  );
}
