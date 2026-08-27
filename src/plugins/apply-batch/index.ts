/**
 * apply-batch server 侧:definePlugin 接入(manifest 单源)。
 * 十条路由:读(changes/graph/logs + 主查询)走 route,写(status/approve/adjust/retry/pause/resume/reset)走 guardedRoute。
 * store 变更 → broadcast('state') 经 500ms 节流(节流窗口合并,防消息风暴)。
 * 响应形状与迁移前保持一致。
 */
import type http from 'node:http';
import { readBody } from '../../core/read-body.js';
import { ApplyBatchStore, type BatchLog, type BatchState } from '../../server/apply-batch-store.js';
import { defineBuiltin } from '../builtin.js';
import { createThrottledBroadcast } from './throttle.js';
import { manifest } from './manifest.js';

/** store 变更 SSE 广播节流窗口(ms) */
export const APPLY_BATCH_BROADCAST_THROTTLE_MS = 500;

/** 写路由公共样板:解析 JSON body(空体/非法 JSON 语义与迁移前一致,异常交由 guardedRoute 兜底) */
async function readJsonBody(req: http.IncomingMessage): Promise<{
  status: BatchState['status'];
  parallelism?: number;
  skipChanges?: string[];
  name?: string;
}> {
  return JSON.parse(await readBody(req) || '{}');
}

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    const broadcastState = createThrottledBroadcast(() => {
      try { ctx.broadcast('state'); } catch { /* ignore */ }
    }, APPLY_BATCH_BROADCAST_THROTTLE_MS);
    const store = new ApplyBatchStore(root, broadcastState);

    /** 日志公共样板:补 timestamp(changeName 仅在有值时携带) */
    const addLog = (level: BatchLog['level'], message: string, changeName?: string) => {
      const entry: BatchLog = { timestamp: new Date().toISOString(), level, message };
      if (changeName) entry.changeName = changeName;
      store.addLog(entry);
    };
    /** skipChanges 公共样板:非空数组逐个标记 skipped */
    const skipAll = (names: string[]) => {
      for (const name of names) store.updateChange(name, { status: 'skipped' });
    };

    // ── 读路由 ──
    ctx.route('/__apply-batch', async () => store.read());
    ctx.route('/__apply-batch/changes', async () => store.read().changes);
    ctx.route('/__apply-batch/graph', async () => {
      const state = store.read();
      return {
        changes: state.changes.map(c => ({
          name: c.name,
          status: c.status,
          dependencies: c.dependencies,
          batchIndex: c.batchIndex,
        })),
        batches: state.batches,
        conflicts: state.conflicts,
      };
    });
    ctx.route('/__apply-batch/logs', async () => store.read().logs.slice(-100));

    // ── 写路由(全部鉴权) ──
    ctx.guardedRoute('/__apply-batch/status', async (req) => {
      const body = await readJsonBody(req);
      store.updateStatus(body.status);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/approve', async (req) => {
      const body = await readJsonBody(req);
      store.updateStatus('running');
      store.updateParallelism(body.parallelism ?? 2);
      if (body.skipChanges?.length) skipAll(body.skipChanges);
      addLog('info', `用户确认执行计划，并行度=${body.parallelism ?? 2}`);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/adjust', async (req) => {
      const body = await readJsonBody(req);
      if (body.parallelism) store.updateParallelism(body.parallelism);
      if (body.skipChanges?.length) skipAll(body.skipChanges);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/retry', async (req) => {
      const body = await readJsonBody(req);
      const name = body.name;
      if (!name) throw new Error('missing name');
      const change = store.read().changes.find(c => c.name === name);
      if (!change) throw new Error('change not found');
      store.updateChange(name, {
        status: 'pending',
        error: undefined,
        retryCount: (change.retryCount ?? 0) + 1,
      });
      addLog('info', `重试 change: ${name}`, name);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/pause', async () => {
      store.updateStatus('paused');
      addLog('warn', '用户暂停批量执行');
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/resume', async () => {
      store.updateStatus('running');
      addLog('info', '用户恢复批量执行');
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/reset', async () => {
      store.reset();
      return store.read();
    });
  },
});
