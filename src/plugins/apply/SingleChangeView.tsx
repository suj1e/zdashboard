/**
 * 单 change 视图:分栏布局(2026-08-28-apply-page-refactor T2)。
 * 左列 w-72 change 摘要列表(选中高亮、点击写 change param、长名 truncate+title),
 * 右列 flex-1 详情(进度头 → 任务列表 → proposal/design 折叠);
 * 详情按 name 身份守卫,未就绪(冷启动深链/切换瞬态)渲染 Skeleton(S1 修复);
 * lg: 起分栏,小屏退化为上下堆叠。URL change 参数契约不变;数据 usePluginData(files 频道失效)。
 * PluginPage/ViewHeader 由壳与局部组件持有,页面状态(status)经 onStatus 上报。
 */
import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '../../web/components/ui/badge';
import { ProgressBar } from '../../web/components/ProgressBar.js';
import { countTasks, parseTasks } from './parse-tasks.js';
import { ViewHeader } from './ViewHeader.js';
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

/** 🔧[人工] 计数徽标(口径与详情一致:countTasks 的 manual 数) */
function ManualCountBadge({ count }: { count: number }) {
  return <Badge variant="warning">🔧[人工] {count}</Badge>;
}

function DependencyChip({ name, pending }: { name: string; pending: boolean }) {
  const variant = pending ? 'neutral' : 'success';
  return <Badge variant={variant}>{pending ? `${name} · 等待前置` : name}</Badge>;
}

/** proposal.md / design.md 共用的折叠文档区块(details 原生折叠,默认收起) */
function CollapsibleDoc({ label, content }: { label: string; content: string }) {
  const { icon } = useIcons();
  return (
    <details className="border rounded-lg bg-card">
      <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer select-none flex items-center gap-1">
        {icon('file-text', 'h-3 w-3')} {label}
      </summary>
      <div className="prose dark:prose-invert max-w-none text-xs px-3 pb-3">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </details>
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

/** 左列摘要列表项:名称(truncate+title)+ done/total 进度 + design/proposal/worktree 徽标 + 🔧[人工] 计数(已知时) */
function ChangeListItem({ item, selected, manualCount, onSelect }: {
  item: ChangeSummary;
  selected: boolean;
  manualCount: number | null;
  onSelect: () => void;
}) {
  const { icon } = useIcons();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${selected ? 'border-primary bg-muted/50' : 'border-border bg-card hover:bg-muted/50'}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon('folder-open', 'h-3.5 w-3.5 text-muted-foreground shrink-0')}
        <span className="text-sm font-medium font-mono truncate min-w-0" title={item.name}>{item.name}</span>
        <span className="ml-auto flex-none"><StatusPill done={item.done} total={item.total} /></span>
      </div>
      <ProgressBar value={pct(item.done, item.total)} className="h-1 mb-1.5" />
      <div className="flex items-center gap-1.5 flex-wrap">
        {item.hasProposal && <Badge variant="outline">proposal</Badge>}
        {item.hasDesign && <Badge variant="info">design</Badge>}
        {item.inWorktree && <InWorktreeBadge />}
        {manualCount != null && manualCount > 0 && <ManualCountBadge count={manualCount} />}
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
  // 身份守卫:key 切换、新请求未返回期间 usePluginData 保留旧 key 的 data,
  // 仅当详情 name 与当前 change 匹配才视为有效选中,避免瞬态串数据(计数徽标/详情内容)。
  const selected = detail.data && detail.data.name === change ? detail.data : null;
  const { total: taskCount, manual: manualCount } = countTasks(selected?.tasks ?? '');

  useEffect(() => {
    onStatus?.(changes.length ? { label: `${changes.length} 个进行中`, tone: 'info' } : undefined);
  }, [changes.length, onStatus]);

  const select = (name: string) => route.navigate({ change: name });

  return (
    <div className="mx-auto h-full max-w-6xl flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <ViewHeader title="进行中的 change" actions={<WorktreeOverview />} />
      {list.loading && !changes.length ? (
        <div className="p-4"><Skeleton rows={4} /></div>
      ) : !changes.length ? (
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <EmptyState icon={icon('folder-git-2', 'h-6 w-6')} title="没有进行中的 change" hint="在 openspec/changes/ 下创建 change 后会显示在这里" />
        </div>
      ) : (
        <div data-testid="single-split" className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          <aside data-testid="change-list-pane" className="flex-none lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-border p-3 space-y-2 lg:overflow-y-auto">
            {changes.map((c) => (
              <ChangeListItem
                key={c.name}
                item={c}
                selected={c.name === change}
                manualCount={c.name === change && manualCount > 0 ? manualCount : null}
                onSelect={() => select(c.name)}
              />
            ))}
          </aside>
          <section data-testid="change-detail-pane" className="flex-1 min-w-0 min-h-0 lg:overflow-y-auto p-4 space-y-4">
            {change && selected ? (
              <>
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

                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    {icon('file-text', 'h-3 w-3')} tasks.md
                    {taskCount > 0 && <span className="font-mono">({taskCount} 项)</span>}
                  </h4>
                  <div className="border rounded-lg p-3 bg-card">
                    <TaskList tasks={selected.tasks} />
                  </div>
                </div>

                {selected.proposal && <CollapsibleDoc label="proposal.md" content={selected.proposal} />}
                {selected.design && <CollapsibleDoc label="design.md" content={selected.design} />}
              </>
            ) : change && detail.error ? (
              <EmptyState title={`未找到 change「${change}」`} hint={detail.error} />
            ) : change ? (
              // 加载中/详情未就绪(冷启动深链、切换选中瞬态):Skeleton 替代误导性「未选择 change」空态
              <div data-testid="detail-loading" className="p-4"><Skeleton rows={4} /></div>
            ) : (
              <EmptyState title="未选择 change" hint="从左侧列表选择 change 查看详情" />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
