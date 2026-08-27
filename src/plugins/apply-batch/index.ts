/**
 * apply-batch server 侧:definePlugin 接入(manifest 单源)。
 * 十条路由:读(changes/graph/logs + 主查询)走 route,写(status/approve/adjust/retry/pause/resume/reset)走 guardedRoute。
 * store 变更 → broadcast('state') 经 500ms 节流(节流窗口合并,防消息风暴)。
 * 响应形状与迁移前保持一致:写路由非法 JSON/校验失败手写 400 + {error},不经 SDK 500 兜底。
 */
import type http from 'node:http';
import { readBody } from '../../core/read-body.js';
import { ApplyBatchStore, type BatchLog, type BatchState } from '../../server/apply-batch-store.js';
import { defineBuiltin } from '../builtin.js';
import { createThrottledBroadcast } from './throttle.js';
import { manifest } from './manifest.js';

/** store 变更 SSE 广播节流窗口(ms) */
export const APPLY_BATCH_BROADCAST_THROTTLE_MS = 500;

type BatchWriteBody = {
  status?: BatchState['status'];
  parallelism?: number;
  skipChanges?: string[];
  name?: string;
};

/** 写路由 400 错误响应(形状与迁移前一致:400 + {error: 具体信息});写后 handler 返回 undefined 短路 */
function badRequest(res: http.ServerResponse, msg: string): undefined {
  res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: msg }));
  return undefined;
}

/**
 * 解析 JSON 写请求体(空体视作 {});非法 JSON 迁移前语义为 400 + {error: 解析信息},
 * 不交由 guardedRoute 兜底(那会变成 500 internal,破坏既有响应形状)。
 * 解析失败时已写响应并返回 null,handler 需短路。
 */
async function readJsonBody(req: http.IncomingMessage, res: http.ServerResponse): Promise<BatchWriteBody | null> {
  try {
    return JSON.parse(await readBody(req) || '{}') as BatchWriteBody;
  } catch (e) {
    return badRequest(res, e instanceof Error ? e.message : 'unknown error') ?? null;
  }
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

    // ── 写路由(全部鉴权;非法 JSON/校验失败 → 400 + {error},与迁移前一致) ──
    ctx.guardedRoute('/__apply-batch/status', async (req, res) => {
      const body = await readJsonBody(req, res);
      if (!body) return undefined;
      store.updateStatus(body.status);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/approve', async (req, res) => {
      const body = await readJsonBody(req, res);
      if (!body) return undefined;
      store.updateStatus('running');
      store.updateParallelism(body.parallelism ?? 2);
      if (body.skipChanges?.length) skipAll(body.skipChanges);
      addLog('info', `用户确认执行计划，并行度=${body.parallelism ?? 2}`);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/adjust', async (req, res) => {
      const body = await readJsonBody(req, res);
      if (!body) return undefined;
      if (body.parallelism) store.updateParallelism(body.parallelism);
      if (body.skipChanges?.length) skipAll(body.skipChanges);
      return store.read();
    });

    ctx.guardedRoute('/__apply-batch/retry', async (req, res) => {
      const body = await readJsonBody(req, res);
      if (!body) return undefined;
      const name = body.name;
      if (!name) return badRequest(res, 'missing name');
      const change = store.read().changes.find(c => c.name === name);
      if (!change) return badRequest(res, 'change not found');
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
