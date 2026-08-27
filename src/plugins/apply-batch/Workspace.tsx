/**
 * apply-batch 工作区:PluginPage(全局进度 + 暂停/恢复) + 依赖图/确认/进度三视图 + 日志尾。
 * 数据 usePluginData(subscribe plugin:apply-batch:state,无轮询);view/sel 入 URL。
 * store 类型改 import type(运行时不引 server 模块)。
 */
import { lazy, Suspense } from 'react';
import { toast } from 'sonner';
import type { BatchChange, BatchLog, BatchState } from '../../server/apply-batch-store.js';
import { PluginPage } from '../../web/kit/index.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { useModeIcon } from '../../web/lib/icons.js';
import { getStopToken } from '../../web/lib/stop-token.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';

const DependencyGraph = lazy(() => import('./viewers/DependencyGraph.js'));
const ApprovalPanel = lazy(() => import('./viewers/ApprovalPanel.js'));
const CheckpointViewer = lazy(() => import('./viewers/CheckpointViewer.js'));

const VIEWS = ['graph', 'approval', 'checkpoint'] as const;
type ViewKey = (typeof VIEWS)[number];

const VIEW_LABEL: Record<ViewKey, string> = { graph: '依赖图', approval: '确认', checkpoint: '进度' };

function asView(v: string | null): ViewKey {
  return (VIEWS as readonly string[]).includes(v ?? '') ? (v as ViewKey) : 'graph';
}

/** 日志级别着色(与迁前一致:error/warn 高亮,其余弱化) */
function logLevelClass(level: BatchLog['level']): string {
  if (level === 'error') return 'text-destructive';
  if (level === 'warn') return 'text-warning';
  return 'text-muted-foreground';
}

export default function Workspace(_props: PluginWorkspaceProps) {
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  // 读实时路由参数:页内按钮写回 URL 后立即生效(深链接同源)
  const params = route.params;
  const view = asView(params.get('view'));
  const sel = params.get('sel');

  const query = usePluginData<BatchState>('apply-batch:/__apply-batch', () =>
    fetch('/__apply-batch', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'plugin:apply-batch:state' });
  const state = query.data;

  const post = async (path: string, body?: unknown) => {
    const res = await fetch(`/__apply-batch/${path}`, {
      method: 'POST',
      // 页面无 meta[name=stop-token],token 经 /__config 获取(guardedRoute 鉴权必需)
      headers: {
        'Content-Type': 'application/json',
        'x-stop-token': await getStopToken(),
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (!res.ok) toast.error(`操作失败(HTTP ${res.status}):${path}`);
    query.reload();
  };

  if (!state) {
    return (
      <PluginPage manifest={manifest} icon={themed} breadcrumb={['插件', manifest.mode]}>
        <div className="flex items-center justify-center h-full text-lg text-muted-foreground">
          {query.error ? '暂无批量执行数据' : '加载中...'}
        </div>
      </PluginPage>
    );
  }

  const completed = state.changes.filter((c: BatchChange) => c.status === 'completed').length;
  const failed = state.changes.filter((c: BatchChange) => c.status === 'failed').length;
  const parked = state.changes.filter((c: BatchChange) => c.status === 'parked').length;
  const running = state.changes.filter((c: BatchChange) => c.status === 'running').length;
  const total = state.changes.length;

  const handleApprove = (parallelism: number, skipChanges: string[]) => post('approve', { parallelism, skipChanges });
  const handleRetry = (name: string) => post('retry', { name });

  const setView = (v: ViewKey) => route.navigate({ view: v });
  const selectChange = (name: string | null) => route.navigate({ sel: name });

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={['插件', manifest.mode]}
      status={total ? { label: `${completed + failed}/${total}`, tone: failed ? 'warning' : 'info' } : undefined}
      actions={
        <>
          {state.status === 'running' && (
            <button onClick={() => void post('pause')} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">
              暂停
            </button>
          )}
          {state.status === 'paused' && (
            <button onClick={() => void post('resume')} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">
              恢复
            </button>
          )}
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-md ${view === v ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </>
      }
    >
      <div className="flex flex-col h-full">
        <div className="flex-none px-4 py-2 border-b border-border flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="text-sm font-semibold text-foreground">zapply batch</span>
          <span>并行度: {state.parallelism}</span>
          <span>·</span>
          <span>🔄 {running} 运行中</span>
          <span>·</span>
          <span>✅ {completed} 成功</span>
          <span>·</span>
          <span>❌ {failed} 失败</span>
          <span>·</span>
          <span>⏸️ {parked} parked</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Suspense fallback={<div className="flex items-center justify-center h-full">加载中...</div>}>
            <div data-testid={`batch-view-${view}`} className="h-full">
              {view === 'graph' && (
                <DependencyGraph
                  state={state}
                  selectedChange={sel}
                  onSelectChange={selectChange}
                  onRetry={handleRetry}
                />
              )}
              {view === 'approval' && (
                <ApprovalPanel state={state} onApprove={handleApprove} />
              )}
              {view === 'checkpoint' && (
                <CheckpointViewer
                  state={state}
                  selectedChange={sel}
                  onSelectChange={selectChange}
                />
              )}
            </div>
          </Suspense>
        </div>

        {state.status === 'pending-approval' && (
          <div className="border-t border-border bg-warning/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">需要确认执行计划</p>
                <p className="text-sm text-muted-foreground mt-1">
                  检测到 {total} 个变更，{parked} 个风险项已 parked，{state.conflicts.length} 个冲突
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleApprove(state.parallelism, [])}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  确认执行
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-border px-6 py-2 max-h-32 overflow-y-auto">
          <div className="text-xs font-mono space-y-1">
            {state.logs.slice(-20).reverse().map((log: BatchLog, i: number) => (
              <div key={i} className={logLevelClass(log.level)}>
                <span className="text-muted-foreground/60">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                {log.changeName && <span className="text-info ml-2">[{log.changeName}]</span>}
                <span className="ml-2">{log.message}</span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </PluginPage>
  );
}
