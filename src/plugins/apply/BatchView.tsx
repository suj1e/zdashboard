/**
 * 批量驾驶舱视图(只读):汇总条 + 依赖图/进度子视图 + plan 只读展示 + 日志尾。
 * 数据源 .zdev/apply/runs/<runId>/(经 /__apply/batch* 只读路由);写控件全部删除
 * (状态文件由 zapply skill 写入,dashboard 只读避免双写)。
 * 刷新订阅全局 files 频道(skill 写文件 → fs.watch → SSE files → 失效重取)。
 * 子视图切换用组件 state(URL view param 归 Tab 壳;选中 change 仍经 sel 入 URL)。
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { BatchChange, BatchGraph, BatchLog, BatchSnapshot, BatchState } from './batch.js';
import { ViewHeader } from './ViewHeader.js';
import { EmptyState } from '../../web/kit/index.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { useIcons } from '../../web/lib/icons.js';
import type { PageStatus } from './SingleChangeView.js';

const DependencyGraph = lazy(() => import('./viewers/DependencyGraph.js'));
const CheckpointViewer = lazy(() => import('./viewers/CheckpointViewer.js'));

const SUB_VIEWS = ['graph', 'checkpoint'] as const;
type SubViewKey = (typeof SUB_VIEWS)[number];

const SUB_VIEW_LABEL: Record<SubViewKey, string> = { graph: '依赖图', checkpoint: '进度' };

/** 日志尾显示条数(与迁前一致;数据源为服务端尾窗 /__apply/batch/logs) */
const LOG_TAIL = 20;

/** 日志级别着色(与迁前一致:error/warn 高亮,其余弱化) */
function logLevelClass(level: BatchLog['level']): string {
  if (level === 'error') return 'text-destructive';
  if (level === 'warn') return 'text-warning';
  return 'text-muted-foreground';
}

function useBatchData() {
  const snapshot = usePluginData<BatchSnapshot>('apply:/__apply/batch', () =>
    fetch('/__apply/batch', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });
  const graph = usePluginData<BatchGraph>('apply:/__apply/batch/graph', () =>
    fetch('/__apply/batch/graph', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });
  const logs = usePluginData<BatchLog[]>('apply:/__apply/batch/logs', () =>
    fetch('/__apply/batch/logs', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });
  const plan = usePluginData<string | null>('apply:/__apply/batch/plan', () =>
    fetch('/__apply/batch/plan', { cache: 'no-store' })
      .then(r => (r.ok ? r.json().then((d: { plan: string }) => d.plan) : null))
      .catch(() => null), { subscribe: 'files' });
  return { snapshot, graph, logs, plan };
}

function BatchEmptyState({ run, hasError }: { run: BatchSnapshot['run']; hasError: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
      <EmptyState
        title="暂无批量执行数据"
        hint="在 zapply batch 中启动批量执行后,状态会出现在这里"
      />
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>状态文件:<code className="font-mono">.zdev/apply/runs/&lt;runId&gt;/state.json</code>(由 zapply 写入,本页只读)</p>
        <p>旧 .zapply/batch-state.json 历史数据不迁移,仅留档</p>
        {run !== null && <p>CURRENT 指向的 run 状态缺失或损坏(历史 run 只读)</p>}
        {hasError && <p>数据加载失败,请稍后重试或刷新页面</p>}
      </div>
    </div>
  );
}

export default function BatchView({ onStatus }: { onStatus?: (s: PageStatus) => void } = {}) {
  const { icon } = useIcons();
  const route = useRoute();
  const sel = route.params.get('sel');
  const [subView, setSubView] = useState<SubViewKey>('graph');
  const { snapshot, graph, logs, plan } = useBatchData();

  const state = snapshot.data?.state ?? null;
  const run = snapshot.data?.run ?? null;

  const counts = {
    completed: state?.changes.filter((c: BatchChange) => c.status === 'completed').length ?? 0,
    failed: state?.changes.filter((c: BatchChange) => c.status === 'failed').length ?? 0,
    parked: state?.changes.filter((c: BatchChange) => c.status === 'parked').length ?? 0,
    running: state?.changes.filter((c: BatchChange) => c.status === 'running').length ?? 0,
  };
  const total = state?.changes.length ?? 0;

  useEffect(() => {
    onStatus?.(total ? { label: `${counts.completed + counts.failed}/${total}`, tone: counts.failed ? 'warning' : 'info' } : undefined);
  }, [total, counts.completed, counts.failed, onStatus]);

  if (!state) {
    return (
      <div data-testid="batch-view" className="h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
        {snapshot.data === null && !snapshot.error ? (
          <div className="flex items-center justify-center h-full">加载中...</div>
        ) : (
          <BatchEmptyState run={run} hasError={!!snapshot.error} />
        )}
      </div>
    );
  }

  const selectChange = (name: string | null) => route.navigate({ sel: name });

  return (
    <div data-testid="batch-view" className="h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <ViewHeader title="zapply batch" />
      <div className="flex-none px-4 py-2 border-b border-border flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span>并行度: {state.parallelism}</span>
        <span>·</span>
        <span>🔄 {counts.running} 运行中</span>
        <span>·</span>
        <span>✅ {counts.completed} 成功</span>
        <span>·</span>
        <span>❌ {counts.failed} 失败</span>
        <span>·</span>
        <span>⏸️ {counts.parked} parked</span>
        <span className="ml-auto text-xs">run: {run?.id ?? '-'} · 只读</span>
      </div>

      <div className="flex-none px-4 py-1.5 border-b border-border flex items-center gap-2">
        {SUB_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSubView(v)}
            className={`px-3 py-1 text-xs rounded-md ${subView === v ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            {SUB_VIEW_LABEL[v]}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-full">加载中...</div>}>
          <div data-testid={`batch-subview-${subView}`} className="h-full">
            {subView === 'graph' && (
              <DependencyGraph
                graph={graph.data ?? { changes: [], batches: [], conflicts: [] }}
                selectedChange={sel}
                onSelectChange={selectChange}
              />
            )}
            {subView === 'checkpoint' && (
              <CheckpointViewer
                state={state as BatchState}
                selectedChange={sel}
                onSelectChange={selectChange}
              />
            )}
          </div>
        </Suspense>
      </div>

      {plan.data && (
        <div className="flex-none border-t border-border px-6 py-3 max-h-48 overflow-y-auto">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            {icon('file-text', 'h-3 w-3')} 执行计划 plan.md(只读)
          </h4>
          <div className="prose dark:prose-invert max-w-none text-xs bg-card border rounded-lg p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.data}</ReactMarkdown>
          </div>
        </div>
      )}

      <footer className="border-t border-border px-6 py-2 max-h-32 overflow-y-auto">
        <div className="text-xs font-mono space-y-1">
          {(logs.data ?? []).slice(-LOG_TAIL).reverse().map((log: BatchLog, i: number) => (
            <div key={i} className={logLevelClass(log.level)}>
              <span className="text-muted-foreground/60">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {log.changeName && <span className="text-info ml-2">[{log.changeName}]</span>}
              <span className="ml-2">{log.message}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
