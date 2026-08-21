import type { Context } from 'cordis';
import { scanAssets } from '../../server/design-assets.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({ mode: 'design', label: '设计资产', icon: '🎨', description: '页面/组件/图标/Token 分类预览' });

      ctx.server.route('/__design/assets', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(scanAssets(root)));
      });
    });
  },
};
