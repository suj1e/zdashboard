import type { Context } from 'cordis';
import { ApplyBatchStore } from '../../server/apply-batch-store.js';

export const apply = {
  inject: ['server', 'dashboard', 'reload'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({
        mode: 'apply-batch',
        label: '批量执行',
        icon: '⚡',
        description: 'zapply 批量并行执行驾驶舱',
      });

      const store = new ApplyBatchStore(root, () => {
        try { ctx.reload.broadcast('files'); } catch { /* ignore */ }
      });

      ctx.server.route('/__apply-batch', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read()));
      });

      ctx.server.route('/__apply-batch/status', async (req, res) => {
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          store.updateStatus(body.status);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(store.read()));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__apply-batch/changes', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read().changes));
      });

      ctx.server.route('/__apply-batch/graph', async (_req, res) => {
        const state = store.read();
        const graph = {
          changes: state.changes.map(c => ({
            name: c.name,
            status: c.status,
            dependencies: c.dependencies,
            batchIndex: c.batchIndex,
          })),
          batches: state.batches,
          conflicts: state.conflicts,
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(graph));
      });

      ctx.server.route('/__apply-batch/logs', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read().logs.slice(-100)));
      });

      ctx.server.route('/__apply-batch/approve', async (req, res) => {
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          store.updateStatus('running');
          store.updateParallelism(body.parallelism ?? 2);
          if (body.skipChanges?.length) {
            for (const name of body.skipChanges) {
              store.updateChange(name, { status: 'skipped' });
            }
          }
          store.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `用户确认执行计划，并行度=${body.parallelism ?? 2}`,
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(store.read()));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__apply-batch/adjust', async (req, res) => {
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          if (body.parallelism) store.updateParallelism(body.parallelism);
          if (body.skipChanges?.length) {
            for (const name of body.skipChanges) {
              store.updateChange(name, { status: 'skipped' });
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(store.read()));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__apply-batch/retry', async (req, res) => {
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const name = body.name;
          if (!name) throw new Error('missing name');
          const change = store.read().changes.find(c => c.name === name);
          if (!change) throw new Error('change not found');
          store.updateChange(name, {
            status: 'pending',
            error: undefined,
            retryCount: (change.retryCount ?? 0) + 1,
          });
          store.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `重试 change: ${name}`,
            changeName: name,
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(store.read()));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__apply-batch/pause', async (req, res) => {
        store.updateStatus('paused');
        store.addLog({
          timestamp: new Date().toISOString(),
          level: 'warn',
          message: '用户暂停批量执行',
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read()));
      });

      ctx.server.route('/__apply-batch/resume', async (req, res) => {
        store.updateStatus('running');
        store.addLog({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: '用户恢复批量执行',
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read()));
      });

      ctx.server.route('/__apply-batch/reset', async (req, res) => {
        store.reset();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(store.read()));
      });
    });
  },
};
