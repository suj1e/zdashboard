import type { Context } from 'cordis';
import { scanTree } from '../server/spec-scan.js';

/** 生态约定:项目根/worktree 根下的固定扫描目录,非用户可配;.zdev/apply 为点前缀目录,经 dotDirs 显式放行 */
const CONVENTION_SCAN_DIRS = ['openspec', 'docs', '.zdev/apply'] as const;
/** 点前缀扫描目录子集:scanTree 须声明才可扫(walkDir 点前缀最小例外) */
const CONVENTION_DOT_DIRS = CONVENTION_SCAN_DIRS.filter((d) => d.startsWith('.'));

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
          const tree = scanTree(scanRoot, [...CONVENTION_SCAN_DIRS], { dotDirs: [...CONVENTION_DOT_DIRS] });
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
