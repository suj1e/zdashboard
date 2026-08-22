import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../../web/components/ui/button';

interface ZenBug {
  id: number;
  title: string;
  severity: number | string;
  pri: number | string;
  status: string;
  assignedTo: string;
  openedBy?: string;
  mine: boolean;
}

type Payload =
  | { ok: true; url: string; total: number; bugs: ZenBug[] }
  | { ok: false; error: string };

const STATUS_FILTERS = [
  { key: 'mine', label: '我的' },
  { key: 'all', label: '全部' },
  { key: 'active', label: 'active' },
  { key: 'resolved', label: 'resolved' },
  { key: 'closed', label: 'closed' },
] as const;

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' :
    status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
    'bg-muted text-muted-foreground border-border';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${cls}`}>{status}</span>;
}

function SevBadge({ severity }: { severity: number | string }) {
  const s = Number(severity);
  const cls =
    s <= 1 ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
    s === 2 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
    s === 3 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' :
    'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${cls}`}>S{s}</span>;
}

export function BugViewer() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('mine');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/__bugs', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const match = (b: ZenBug) => (filter === 'all' ? true : filter === 'mine' ? b.mine : b.status === filter);
  const bugs = data?.ok ? data.bugs.filter(match) : [];
  const counts = data?.ok
    ? {
        mine: data.bugs.filter((b) => b.mine).length,
        all: data.bugs.length,
        active: data.bugs.filter((b) => b.status === 'active').length,
        resolved: data.bugs.filter((b) => b.status === 'resolved').length,
        closed: data.bugs.filter((b) => b.status === 'closed').length,
      }
    : null;

  return (
    <div className="mx-auto h-full max-w-6xl flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <div className="flex-none flex items-center gap-2 px-3 py-2 border-b">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
            {counts && <span className="ml-1 opacity-70">{counts[f.key as keyof typeof counts]}</span>}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">禅道 · 只读</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={load} title="刷新">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {!data ? (
          <p className="p-4 text-xs text-muted-foreground">加载中…</p>
        ) : !data.ok ? (
          <p className="p-4 text-xs text-destructive">{data.error}</p>
        ) : !bugs.length ? (
          <p className="p-4 text-xs text-muted-foreground">{filter === 'mine' ? '没有指派给你的 bug 🎉' : '无 bug 🎉(该状态下)'}</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium w-16">#</th>
                <th className="px-3 py-2 font-medium">标题</th>
                <th className="px-3 py-2 font-medium w-14">严重度</th>
                <th className="px-3 py-2 font-medium w-20">状态</th>
                <th className="px-3 py-2 font-medium w-20">指派</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-3 py-2 font-mono text-muted-foreground">{b.id}</td>
                  <td className="px-3 py-2">
                    <button
                      className="text-left hover:text-primary hover:underline flex items-center gap-1"
                      onClick={() => window.open(`${data.url}/bug-view-${b.id}.html`, '_blank', 'noopener')}
                      title="在禅道打开"
                    >
                      <span className="truncate max-w-[420px]">{b.title}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  </td>
                  <td className="px-3 py-2"><SevBadge severity={b.severity} /></td>
                  <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{b.assignedTo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BugViewer;
