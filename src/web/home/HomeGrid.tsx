import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import type { WebPlugin } from '../lib/plugins';

interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean }

const DETECT_ITEMS: { key: keyof Detects; label: string }[] = [
  { key: 'hasOpenspec', label: 'openspec' },
  { key: 'hasDocs', label: 'docs' },
  { key: 'hasJust', label: 'just' },
  { key: 'hasBugs', label: 'bugs' },
];

export function HomeGrid({ plugins, detect, onSelect }: {
  plugins: WebPlugin[]; detect: Detects; onSelect: (mode: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((p) => (
          <button
            key={p.mode}
            onClick={() => onSelect(p.mode)}
            className="text-left group rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-muted-foreground/30">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-muted text-lg leading-none group-hover:bg-primary/10 transition-colors">{p.icon}</span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <span className="truncate">{p.label}</span>
                      {p.external && <span className="flex-none text-xs px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-muted-foreground border">外部</span>}
                    </CardTitle>
                    <CardDescription className="truncate">{p.description ?? p.mode}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </button>
        ))}
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
