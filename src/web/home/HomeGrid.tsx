import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { FolderOpen, FileText, BookOpen, Terminal } from 'lucide-react';
import type { WebPlugin } from '../lib/plugins';

interface Detects { hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean }

function Pill({ label, on }: { label: string; on: boolean }) {
  return <span className={`text-[11px] ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{label}: {on ? 'ON' : 'OFF'}</span>;
}

export function HomeGrid({ plugins, detect, onSelect }: {
  plugins: WebPlugin[]; detect: Detects; onSelect: (mode: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((p) => (
          <button
            key={p.mode}
            onClick={() => onSelect(p.mode)}
            className="text-left"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{p.icon}</span>
                  <CardTitle className="text-sm">{p.label}</CardTitle>
                  {p.external && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">外部</span>}
                </div>
                {p.description && <CardDescription>{p.description}</CardDescription>}
              </CardHeader>
            </Card>
          </button>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xs text-muted-foreground">探测信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Pill label="openspec" on={detect.hasOpenspec} />
            <Pill label="docs" on={detect.hasDocs} />
            <Pill label="just" on={detect.hasJust} />
            <Pill label="bugs" on={detect.hasBugs} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
