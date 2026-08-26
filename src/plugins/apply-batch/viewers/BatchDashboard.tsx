import { useState, useEffect, useCallback } from 'react';
import { lazy, Suspense } from 'react';
import { ApplyBatchStore } from '../../../server/apply-batch-store.js';
import type { BatchChange, BatchLog } from '../../../server/apply-batch-store.js';

const DependencyGraph = lazy(() => import('./DependencyGraph.js'));
const ApprovalPanel = lazy(() => import('./ApprovalPanel.js'));
const CheckpointViewer = lazy(() => import('./CheckpointViewer.js'));

const PLUGIN_PREFIX = '/__apply-batch';

export default function BatchDashboard() {
  const [state, setState] = useState<ReturnType<typeof ApplyBatchStore.prototype.read>>(null as any);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'approval' | 'checkpoint'>('graph');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${PLUGIN_PREFIX}`);
      const data = await res.json();
      setState(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [load]);

  const handleApprove = async (parallelism: number, skipChanges: string[]) => {
    await fetch(`${PLUGIN_PREFIX}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parallelism, skipChanges }),
    });
    load();
  };

  const handleRetry = async (name: string) => {
    await fetch(`${PLUGIN_PREFIX}/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    load();
  };

  const handlePause = async () => {
    await fetch(`${PLUGIN_PREFIX}/pause`, { method: 'POST' });
    load();
  };

  const handleResume = async () => {
    await fetch(`${PLUGIN_PREFIX}/resume`, { method: 'POST' });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">暂无批量执行数据</div>
      </div>
    );
  }

  const completed = state.changes.filter((c: BatchChange) => c.status === 'completed').length;
  const failed = state.changes.filter((c: BatchChange) => c.status === 'failed').length;
  const parked = state.changes.filter((c: BatchChange) => c.status === 'parked').length;
  const running = state.changes.filter((c: BatchChange) => c.status === 'running').length;
  const total = state.changes.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">⚡ zapply batch</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>并行度: {state.parallelism}</span>
            <span>·</span>
            <span>进度: {completed + failed}/{total}</span>
            <span>·</span>
            <span>🔄 {running} 运行中</span>
            <span>·</span>
            <span>✅ {completed} 成功</span>
            <span>·</span>
            <span>❌ {failed} 失败</span>
            <span>·</span>
            <span>⏸️ {parked} parked</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.status === 'running' && (
            <button onClick={handlePause} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">
              暂停
            </button>
          )}
          {state.status === 'paused' && (
            <button onClick={handleResume} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-accent">
              恢复
            </button>
          )}
          <button
            onClick={() => setView('graph')}
            className={`px-3 py-1.5 text-sm rounded-md ${view === 'graph' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            依赖图
          </button>
          <button
            onClick={() => setView('approval')}
            className={`px-3 py-1.5 text-sm rounded-md ${view === 'approval' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            确认
          </button>
          <button
            onClick={() => setView('checkpoint')}
            className={`px-3 py-1.5 text-sm rounded-md ${view === 'checkpoint' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            进度
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-full">加载中...</div>}>
          {view === 'graph' && (
            <DependencyGraph
              state={state}
              selectedChange={selectedChange}
              onSelectChange={setSelectedChange}
              onRetry={handleRetry}
            />
          )}
          {view === 'approval' && (
            <ApprovalPanel state={state} onApprove={handleApprove} />
          )}
          {view === 'checkpoint' && (
            <CheckpointViewer
              state={state}
              selectedChange={selectedChange}
              onSelectChange={setSelectedChange}
            />
          )}
        </Suspense>
      </div>

      {/* Approval Banner */}
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
                onClick={() => handleApprove(state.parallelism, [])}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Logs */}
      <footer className="border-t border-border px-6 py-2 max-h-32 overflow-y-auto">
        <div className="text-xs font-mono space-y-1">
          {state.logs.slice(-20).reverse().map((log: BatchLog, i: number) => (
            <div key={i} className={`${log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-warning' : 'text-muted-foreground'}`}>
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
