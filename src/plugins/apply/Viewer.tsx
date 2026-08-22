import { useEffect, useState, useCallback } from 'react';
import { FileText, FolderOpen, GitBranch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRef } from 'react';
import { useSSE } from '../../web/hooks/useSSE.js';
import remarkGfm from 'remark-gfm';

interface ChangeSummary {
  name: string;
  path: string;
  total: number;
  done: number;
  hasProposal: boolean;
  hasDesign: boolean;
  inWorktree: boolean;
}

interface ChangeDetail extends ChangeSummary {
  proposal?: string;
  design?: string;
  tasks: string;
  dependsOn: string[];
  hasTestStrategy: boolean;
}

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function StatusPill({ done, total }: { done: number; total: number }) {
  const p = pct(done, total);
  const cls =
    p === 100
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      : p > 0
        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
        : 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${cls}`}>
      {done}/{total} · {p}%
    </span>
  );
}

function InWorktreeBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/30">
      worktree 执行中
    </span>
  );
}

function TestStrategyBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-purple-500/10 text-purple-600 border-purple-500/30">
      含测试策略
    </span>
  );
}

function DependencyChip({ name, pending }: { name: string; pending: boolean }) {
  // pending = 前置仍在活跃 change 列表（未归档）→ 灰色「等待前置」；已归档/不存在 → 正常显示（已满足）
  const cls = pending
    ? 'bg-muted text-muted-foreground border-border'
    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${cls}`}>
      {pending ? `${name} · 等待前置` : name}
    </span>
  );
}

function TaskList({ tasks }: { tasks: string }) {
  const lines = tasks.split('\n').filter((l) => l.trim().startsWith('- ['));
  if (!lines.length) return <p className="text-xs text-muted-foreground">无 tasks.md</p>;
  const firstUnchecked = lines.findIndex((l) => !/- \[[xX]\]/.test(l)); // 接下来要做的项
  return (
    <ul className="space-y-1 text-xs">
      {lines.map((l, i) => {
        const checked = /- \[[xX]\]/.test(l);
        const isNext = i === firstUnchecked;
        const text = l.replace(/^-\s*\[[ xX]\]\s*/, '');
        return (
          <li key={i} className={`flex items-start gap-2 rounded px-1.5 -mx-1.5 py-0.5 ${isNext ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''} ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
            {checked ? (
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">✓</span>
            ) : (
              <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border ${isNext ? 'border-amber-500' : 'border-muted-foreground/50'}`} />
            )}
            <span>{text}</span>
            {isNext && <span className="ml-auto flex-none text-[10px] font-medium text-amber-600 dark:text-amber-400">← 下一步</span>}
          </li>
        );
      })}
    </ul>
  );
}

function ChangeCard({ item, onSelect }: { item: ChangeSummary; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium font-mono truncate">{item.name}</span>
        <StatusPill done={item.done} total={item.total} />
        {item.inWorktree && <InWorktreeBadge />}
      </div>
      <div className="h-1 rounded-full bg-muted mb-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct(item.done, item.total) === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${pct(item.done, item.total)}%` }} />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className={item.hasProposal ? 'text-foreground' : ''}>proposal</span>
        <span className={item.hasDesign ? 'text-foreground' : ''}>design</span>
      </div>
    </button>
  );
}

function WorktreeOverview({ refreshKey }: { refreshKey: number }) {
  const [wts, setWts] = useState<{ name: string; branch: string; head: string }[]>([]);

  useEffect(() => {
    fetch('/__worktrees', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setWts)
      .catch(() => setWts([]));
  }, [refreshKey]);

  if (!wts.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground mr-1">Worktree:</span>
      {wts.map((w) => (
        <span
          key={w.name}
          className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-sky-500/10 text-sky-600 border-sky-500/30"
          title={w.head}
        >
          {w.name}@{w.branch || 'detached'}
        </span>
      ))}
    </div>
  );
}

export function ApplyViewer() {
  const [changes, setChanges] = useState<ChangeSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const stoppedRef = useRef(false);
  useSSE(() => {}, () => setRefreshKey(k => k + 1), stoppedRef);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChangeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setLoading(true);
    // 不清当前选中详情:文件变化刷新列表时,用户正在看的详情保持(SSE files 高频触发)
    fetch('/__apply', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setChanges)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList, refreshKey]);

  const select = useCallback((name: string) => {
    setLoading(true);
    setSelectedName(name);
    fetch(`/__apply/change?name=${encodeURIComponent(name)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then(setSelected)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !changes.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold animate-pulse">
            ⚙️
          </div>
          <p>加载执行进度…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-6xl flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <div className="flex-none px-4 py-3 border-b flex items-center gap-2">
        <span className="text-sm font-medium">OpenSpec 执行进度</span>
        <span className="ml-auto text-[11px] text-muted-foreground">openspec/changes/</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        <WorktreeOverview refreshKey={refreshKey} />

        {!changes.length ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">没有进行中的 change</p>
            <p className="text-xs mt-1">在 openspec/changes/ 下创建 change 后会显示在这里</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {changes.map((c) => (
              <ChangeCard
                key={c.name}
                item={c}
                onSelect={() => select(c.name)}
              />
            ))}
          </div>
        )}

        {selectedName && selected && !loading && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium">{selected.name}</h3>
              <StatusPill done={selected.done} total={selected.total} />
              {selected.inWorktree && <InWorktreeBadge />}
              {selected.hasTestStrategy && <TestStrategyBadge />}
            </div>

            {selected.dependsOn.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">依赖:</span>
                {selected.dependsOn.map((name) => (
                  <DependencyChip
                    key={name}
                    name={name}
                    pending={changes.some((c) => c.name === name)}
                  />
                ))}
              </div>
            )}

            {selected.proposal && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> proposal.md
                </h4>
                <div className="prose dark:prose-invert max-w-none text-xs border rounded-lg p-3 bg-card">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.proposal}</ReactMarkdown>
                </div>
              </div>
            )}
            {selected.design && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> design.md
                </h4>
                <div className="prose dark:prose-invert max-w-none text-xs border rounded-lg p-3 bg-card">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.design}</ReactMarkdown>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> tasks.md
              </h4>
              <div className="border rounded-lg p-3 bg-card">
                <TaskList tasks={selected.tasks} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ApplyViewer;
