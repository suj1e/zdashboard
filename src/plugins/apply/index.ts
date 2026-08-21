import type { Context } from 'cordis';
import { scanApplyChanges, readApplyChange } from './scan.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({ mode: 'apply', label: '执行进度', icon: '⚙️', description: 'OpenSpec change 任务进度' });

      ctx.server.route('/__apply', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(scanApplyChanges(root)));
      });

      ctx.server.route('/__apply/change', async (req, res) => {
        const url = new URL(req.url || '', 'http://x');
        const name = url.searchParams.get('name');
        if (!name) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'missing name' }));
          return;
        }
        if (name.includes('..') || name.includes('/')) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'invalid name' }));
          return;
        }
        try {
          const data = readApplyChange(root, name);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(data));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });
    });
  },
};
