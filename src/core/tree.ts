import type { Context } from 'cordis';
import { scanTree } from '../server/spec-scan.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const server = ctx.server;
    if (server?.route) {
      // /__files 仅返回目录树;探测位已由独立轻量接口 /__detect 承担,不再搭车
      server.route('/__files', async (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const wt = url.searchParams.get('wt');
          const scanRoot = wt ? decodeURIComponent(wt) : config.root;
          const viewCfg = ctx.dashboard.getConfig('view') as { scanDirs?: string[]; defaultExpandDepth?: number; showHidden?: boolean } | undefined;
          const tree = scanTree(scanRoot, Array.isArray(viewCfg?.scanDirs) ? viewCfg.scanDirs : ['openspec'], {
            defaultExpandDepth: typeof viewCfg?.defaultExpandDepth === 'number' ? viewCfg.defaultExpandDepth : undefined,
            showHidden: typeof viewCfg?.showHidden === 'boolean' ? viewCfg.showHidden : undefined,
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify({ tree }));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify({ tree: [] }));
        }
      });
    }
  },
};
