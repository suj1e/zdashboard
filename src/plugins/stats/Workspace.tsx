import { useEffect, useState } from 'react';

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

export default function Workspace() {
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

  const mb = (data.totalSize / 1024 / 1024).toFixed(2);
  const max = Math.max(...data.byExt.map(e => e.count), 1);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-lg font-semibold mb-1">📊 项目统计</h1>
        <p className="text-xs text-muted-foreground mb-5">后端 fs 扫描 + 前端渲染 · 改文件即时刷新</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: '文件', value: data.files },
            { label: '目录', value: data.dirs },
            { label: '总大小', value: `${mb} MB` },
            { label: 'Markdown', value: data.markdown },
            { label: '变更 进行/归档', value: `${data.openspec.active}/${data.openspec.archived}` },
          ].map(card => (
            <div key={card.label} className="rounded-lg border bg-background p-4">
              <div className="text-xl font-bold">{card.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{card.label}</div>
            </div>
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
    </div>
  );
}
