import type { Context } from 'cordis';
import { fetchBugs } from '../../server/bugs.js';

export const apply = {
  inject: ['server'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.server.route('/__bugs', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        try {
          const result = await fetchBugs(root);
          res.end(JSON.stringify(result));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      (ctx as any).dashboard?.register({ mode: 'bugs', label: '禅道 Bugs', icon: '🎯', description: '只读 bug 列表' });
    });
  },
};
