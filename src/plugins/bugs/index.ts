import type { Context } from 'cordis';
import { fetchBugs } from '../../server/bugs.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({
        mode: 'bugs',
        label: '禅道 Bugs',
        icon: '🎯',
        description: '只读 bug 列表',
        config: {
          url: { type: 'string', label: '服务器 URL', default: '' },
          account: { type: 'string', label: '账号', default: '' },
          token: { type: 'string', label: 'Token', default: '' },
          product: { type: 'number', label: '产品 ID', default: 0 },
        },
      });

      ctx.server.route('/__bugs', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        try {
          const bugConfig = ctx.dashboard.getConfig('bugs') as { url?: string; account?: string; token?: string; product?: number } | undefined;
          const result = await fetchBugs({
            url: String(bugConfig?.url ?? ''),
            account: String(bugConfig?.account ?? ''),
            token: String(bugConfig?.token ?? ''),
            product: Number(bugConfig?.product ?? 0),
          });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

    });
  },
};
