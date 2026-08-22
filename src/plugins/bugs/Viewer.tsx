import { useCallback, useEffect, useState } from 'react';
import { Bug, ExternalLink, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../web/components/EmptyState.js';
import { Button } from '../../web/components/ui/button';
import { Badge } from '../../web/components/ui/badge';
import { FilterPills } from '../../web/components/FilterPills.js';

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
  const variant = status === 'active' ? 'destructive' : status === 'resolved' ? 'success' : 'neutral';
  return <Badge variant={variant}>{status}</Badge>;
}

function SevBadge({ severity }: { severity: number | string }) {
  const s = Number(severity);
  const variant = s <= 1 ? 'destructive' : s === 2 ? 'warning' : s === 3 ? 'warning' : 'neutral';
  return <Badge variant={variant}>S{s}</Badge>;
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
        <FilterPills
          items={STATUS_FILTERS.map(f => ({ key: f.key, label: f.label, badge: counts ? String(counts[f.key as keyof typeof counts]) : undefined }))}
          value={filter}
          onChange={setFilter}
          ariaLabel="状态筛选"
        />
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
          <EmptyState icon={<Bug className="h-6 w-6" />} title={filter === 'mine' ? '没有指派给你的 bug' : '该状态下无 bug'} hint="🎉" />
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
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
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
