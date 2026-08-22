import { useEffect, useState } from 'react';
import { formatBytes } from '../../web/lib/utils.js';

interface ExtCount { ext: string; count: number }
interface StatsData {
  root: string;
  files: number;
  dirs: number;
  totalSize: number;
  byExt: ExtCount[];
  markdown: number;
  openspec: { active: number; archived: number };
  hasJust: boolean;
}

interface WorkspaceProps {
  navTarget?: { mode?: string; filter?: string; wt?: string };
}

export default function Workspace(_props: WorkspaceProps) {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/__stats/data', { cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>加载失败: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>加载中…</p>
      </div>
    );
  }

  const max = Math.max(...data.byExt.map(e => e.count), 1);

  const cards = [
    { label: '文件', value: data.files, mode: null as string | null, filter: null as string | null },
    { label: '目录', value: data.dirs, mode: null as string | null, filter: null as string | null },
    { label: '总大小', value: formatBytes(data.totalSize), mode: null as string | null, filter: null as string | null },
    { label: 'Markdown', value: data.markdown, mode: 'view', filter: '.md' },
    { label: '变更 进行/归档', value: `${data.openspec.active}/${data.openspec.archived}`, mode: 'apply', filter: null },
  ];

  const handleCardClick = (mode: string | null, filter: string | null) => {
    if (!mode) return;
    window.dispatchEvent(new CustomEvent('zd-dashboard-nav', { detail: { mode, ...(filter ? { filter } : {}) } }));
  };

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto rounded-lg border bg-background p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-1">📊 项目统计</h1>
      <p className="text-xs text-muted-foreground mb-5">后端 fs 扫描 + 前端渲染 · 改文件即时刷新 · 点击卡片跳转</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {cards.map(card => (
            <button
              key={card.label}
              type="button"
              onClick={() => handleCardClick(card.mode, card.filter)}
              disabled={!card.mode}
              title={card.mode ? `点击跳转至 ${card.label}` : undefined}
              className={`rounded-lg border bg-background p-4 text-left transition-colors ${card.mode ? 'hover:bg-muted/70 cursor-pointer' : 'cursor-default opacity-80'}`}
            >
              <div className="text-xl font-bold">{card.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{card.label}</div>
            </button>
          ))}
        </div>

        <h2 className="text-xs font-medium text-muted-foreground mb-3">文件类型 Top 10</h2>
        <div className="space-y-2">
          {data.byExt.map(e => (
            <div key={e.ext} className="flex items-center gap-3 text-xs">
              <span className="w-16 font-mono text-foreground truncate">{e.ext}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(e.count / max * 100).toFixed(1)}%` }} />
              </div>
              <span className="w-8 text-right font-mono text-muted-foreground">{e.count}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${data.hasJust ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' : 'text-muted-foreground border-border'}`}>
            justfile {data.hasJust ? '✓' : '✗'}
          </span>
          <span className="text-muted-foreground">root: {data.root}</span>
        </div>
    </div>
  );
}
