import type { Context } from 'cordis';
import { scanTree } from '../server/spec-scan.js';

/** 生态约定:项目根/worktree 根下的固定扫描目录,非用户可配 */
const CONVENTION_SCAN_DIRS = ['openspec', 'docs'] as const;

export const apply = {
  inject: ['server'] as const,
  apply(ctx: Context, config: { root: string }) {
    const server = ctx.server;
    if (server?.route) {
      // /__files 仅返回目录树;探测位已由独立轻量接口 /__detect 承担,不再搭车
      server.route('/__files', async (req, res) => {
        try {
          const url = new URL(req.url || '/', 'http://localhost');
          const wt = url.searchParams.get('wt');
          const scanRoot = wt ? decodeURIComponent(wt) : config.root;
          const tree = scanTree(scanRoot, [...CONVENTION_SCAN_DIRS]);
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
