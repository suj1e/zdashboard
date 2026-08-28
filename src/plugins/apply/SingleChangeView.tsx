/**
 * 单 change 视图:原 apply Workspace 内容整体迁移(2026-08-28-apply-merge-progress),行为不变。
 * change 列表 + 详情(任务树/进度条),change 入 URL(?change=);数据 usePluginData(files 频道失效)。
 * PluginPage 由 Tab 壳持有,页面状态(status)经 onStatus 上报。
 */
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '../../web/components/ui/badge';
import { ProgressBar } from '../../web/components/ProgressBar.js';
import { countTasks, parseTasks } from './parse-tasks.js';
import { EmptyState, Skeleton } from '../../web/kit/index.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { useIcons } from '../../web/lib/icons.js';
import type { ChangeDetail, ChangeSummary } from './types.js';

export type PageStatus = { label: string; tone?: 'info' | 'success' | 'warning' | 'destructive' } | undefined;

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function StatusPill({ done, total }: { done: number; total: number }) {
  const p = pct(done, total);
  const variant = p === 100 ? 'success' : p > 0 ? 'warning' : 'neutral';
  return (
    <Badge variant={variant}>
      {done}/{total} · {p}%
    </Badge>
  );
}

function InWorktreeBadge() {
  return <Badge variant="info">worktree 执行中</Badge>;
}

function TestStrategyBadge() {
  return <Badge variant="info">含测试策略</Badge>;
}

function DependencyChip({ name, pending }: { name: string; pending: boolean }) {
  const variant = pending ? 'neutral' : 'success';
  return <Badge variant={variant}>{pending ? `${name} · 等待前置` : name}</Badge>;
}

/** proposal.md / design.md 共用的 Markdown 文档区块 */
function MarkdownDoc({ label, content }: { label: string; content: string }) {
  const { icon } = useIcons();
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        {icon('file-text', 'h-3 w-3')} {label}
      </h4>
      <div className="prose dark:prose-invert max-w-none text-xs border rounded-lg p-3 bg-card">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

function TaskList({ tasks }: { tasks: string }) {
  const items = parseTasks(tasks);
  if (!items.length) return <p className="text-xs text-muted-foreground">无 tasks.md</p>;
  // 人工条目(🔧[人工])不作为「下一步」引导
  const firstUnchecked = items.findIndex((t) => !t.checked && !t.manual);
  return (
    <ul className="space-y-1 text-xs">
      {items.map((t, i) => {
        const isNext = i === firstUnchecked;
        // 人工条目弱化样式:恒为 muted,保留 🔧[人工] 前缀文字
        const tone = t.manual ? 'text-muted-foreground' : t.checked ? 'text-foreground' : 'text-muted-foreground';
        return (
          <li key={i} className={`flex items-start gap-2 rounded px-1.5 -mx-1.5 py-0.5 ${isNext ? 'bg-warning/10 border-l-2 border-warning' : ''} ${tone}`}>
            {t.checked ? (
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-success text-white flex items-center justify-center text-xs">✓</span>
            ) : (
              <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border ${isNext ? 'border-warning' : 'border-muted-foreground/50'}`} />
            )}
            <span>{t.text}</span>
            {isNext && <span className="ml-auto flex-none text-xs font-medium text-warning">← 下一步</span>}
          </li>
        );
      })}
    </ul>
  );
}

function ChangeCard({ item, onSelect }: { item: ChangeSummary; onSelect: () => void }) {
  const { icon } = useIcons();
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {icon('folder-open', 'h-4 w-4 text-muted-foreground')}
        <span className="text-sm font-medium font-mono truncate">{item.name}</span>
        <StatusPill done={item.done} total={item.total} />
        {item.inWorktree && <InWorktreeBadge />}
      </div>
      <ProgressBar value={pct(item.done, item.total)} className="h-1 mb-2" />
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className={item.hasProposal ? 'text-foreground' : ''}>proposal</span>
        <span className={item.hasDesign ? 'text-foreground' : ''}>design</span>
      </div>
    </button>
  );
}

function WorktreeOverview() {
  const { icon } = useIcons();
  const wts = usePluginData<{ name: string; branch: string; head: string }[]>('apply:/__worktrees', () =>
    fetch('/__worktrees', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });
  const list = wts.data ?? [];
  if (!list.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {icon('git-branch', 'h-3.5 w-3.5 text-muted-foreground')}
      <span className="text-sm text-muted-foreground mr-1">Worktree:</span>
      {list.map((w) => (
        <span
          key={w.name}
          className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-mono bg-info/10 text-info border-info/30"
          title={w.head}
        >
          {w.name}@{w.branch || 'detached'}
        </span>
      ))}
    </div>
  );
}

export default function SingleChangeView({ onStatus }: { onStatus?: (s: PageStatus) => void }) {
  const { icon } = useIcons();
  const route = useRoute();
  const change = route.params.get('change');

  const list = usePluginData<ChangeSummary[]>('apply:/__apply', () =>
    fetch('/__apply', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });
  const detail = usePluginData<ChangeDetail | null>(`apply:change:${change ?? ''}`, () => {
    if (!change) return Promise.resolve(null);
    return fetch(`/__apply/change?name=${encodeURIComponent(change)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: ChangeDetail & { error?: string }) => {
        if (d && d.error) throw new Error(d.error);
        return d as ChangeDetail;
      });
  }, { subscribe: 'files' });

  const changes = list.data ?? [];
  const selected = detail.data ?? null;
  const { total: taskCount, manual: manualCount } = countTasks(selected?.tasks ?? '');

  useEffect(() => {
    onStatus?.(changes.length ? { label: `${changes.length} 个进行中`, tone: 'info' } : undefined);
  }, [changes.length, onStatus]);

  const select = (name: string) => route.navigate({ change: name });

  return (
    <div className="mx-auto h-full max-w-6xl flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      {list.loading && !changes.length ? (
        <div className="p-4"><Skeleton rows={4} /></div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
          <WorktreeOverview />

          {!changes.length ? (
            <EmptyState icon={icon('folder-git-2', 'h-6 w-6')} title="没有进行中的 change" hint="在 openspec/changes/ 下创建 change 后会显示在这里" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {changes.map((c) => (
                <ChangeCard key={c.name} item={c} onSelect={() => select(c.name)} />
              ))}
            </div>
          )}

          {change && selected && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium">{selected.name}</h3>
                <StatusPill done={selected.done} total={selected.total} />
                {manualCount > 0 && <Badge variant="warning">待人工 {manualCount} 项</Badge>}
                {selected.inWorktree && <InWorktreeBadge />}
                {selected.hasTestStrategy && <TestStrategyBadge />}
              </div>

              {selected.dependsOn.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">依赖:</span>
                  {selected.dependsOn.map((name) => (
                    <DependencyChip key={name} name={name} pending={changes.some((c) => c.name === name)} />
                  ))}
                </div>
              )}

              {selected.proposal && <MarkdownDoc label="proposal.md" content={selected.proposal} />}
              {selected.design && <MarkdownDoc label="design.md" content={selected.design} />}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  {icon('file-text', 'h-3 w-3')} tasks.md
                  {taskCount > 0 && <span className="font-mono">({taskCount} 项)</span>}
                </h4>
                <div className="border rounded-lg p-3 bg-card">
                  <TaskList tasks={selected.tasks} />
                </div>
              </div>
            </section>
          )}

          {change && !selected && detail.error && (
            <EmptyState title={`未找到 change「${change}」`} hint={detail.error} />
          )}
        </div>
      )}
    </div>
  );
}
