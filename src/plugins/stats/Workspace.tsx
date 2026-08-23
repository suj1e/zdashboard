import { useEffect, useState } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { formatBytes } from '../../web/lib/utils.js';
import { ProgressBar } from '../../web/components/ProgressBar.js';

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
  const { icon } = useIcons();
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
    { label: '文件', value: data.files, icon: 'file-text', mode: null as string | null, filter: null as string | null },
    { label: '目录', value: data.dirs, icon: 'folder-tree', mode: null as string | null, filter: null as string | null },
    { label: '总大小', value: formatBytes(data.totalSize), mode: null as string | null, filter: null as string | null },
    { label: 'Markdown', value: data.markdown, icon: 'book-open', mode: 'view', filter: '.md' },
    { label: '变更 进行/归档', value: `${data.openspec.active}/${data.openspec.archived}`, icon: 'git-pull-request', mode: 'apply', filter: null },
  ];

  const handleCardClick = (mode: string | null, filter: string | null) => {
    if (!mode) return;
    window.dispatchEvent(new CustomEvent('zd-dashboard-nav', { detail: { mode, ...(filter ? { filter } : {}) } }));
  };

  return (
    <div className="mx-auto h-full max-w-6xl overflow-auto rounded-lg border bg-background p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-1 flex items-center gap-2">{icon('bar-chart-3', 'h-5 w-5 text-primary')}项目统计</h1>
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
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold">{card.value}</div>
                {card.icon && icon(card.icon as any, 'h-4 w-4 text-muted-foreground/50')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
            </button>
          ))}
        </div>

        <h2 className="text-xs font-medium text-muted-foreground mb-3">文件类型 Top 10</h2>
        <div className="space-y-2">
          {data.byExt.map(e => (
            <div key={e.ext} className="flex items-center gap-3 text-xs">
              <span className="w-16 font-mono text-foreground truncate">{e.ext}</span>
              <ProgressBar value={parseFloat((e.count / max * 100).toFixed(1))} className="flex-1 h-2" />
              <span className="w-8 text-right font-mono text-muted-foreground">{e.count}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${data.hasJust ? 'text-success border-success/30 bg-success/10' : 'text-muted-foreground border-border'}`}>
            justfile {data.hasJust ? '✓' : '✗'}
          </span>
          <span className="text-muted-foreground">root: {data.root}</span>
        </div>
    </div>
  );
}
