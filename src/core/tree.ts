import type { Context } from 'cordis';
import { scanTree } from '../server/spec-scan.js';
import { detect } from '../server/detect.js';
import type { DetectResult } from '../server/detect.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    let cached: { p: Promise<DetectResult>; v?: DetectResult } | null = null;
    const getDet = async (): Promise<DetectResult> => {
      if (cached?.v) return cached.v;
      if (!cached) cached = { p: detect(config.root).catch(() => ({ hasOpenspec: false, hasDocs: false, hasJust: false, hasBugs: false } as DetectResult)) };
      const d = await cached.p;
      cached.v = d;
      return d;
    };

    const server = ctx.server;
    if (server?.route) {
      server.route('/__files', async (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const wt = url.searchParams.get('wt');
          const scanRoot = wt ? decodeURIComponent(wt) : config.root;
          const d = await getDet();
          const viewCfg = ctx.dashboard.getConfig('view') as { hiddenDirs?: string[]; defaultExpandDepth?: number; showHidden?: boolean } | undefined;
          const tree = scanTree(scanRoot, d.hasOpenspec, d.hasDocs, {
            hiddenDirs: Array.isArray(viewCfg?.hiddenDirs) ? viewCfg.hiddenDirs : undefined,
            defaultExpandDepth: typeof viewCfg?.defaultExpandDepth === 'number' ? viewCfg.defaultExpandDepth : undefined,
            showHidden: typeof viewCfg?.showHidden === 'boolean' ? viewCfg.showHidden : undefined,
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify({ tree, ...d }));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify({ tree: [], hasOpenspec: false, hasDocs: false, hasJust: false, hasBugs: false }));
        }
      });
    }
  },
};
