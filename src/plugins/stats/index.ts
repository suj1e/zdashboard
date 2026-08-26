import type { Context } from 'cordis';
import fs from 'node:fs';
import path from 'node:path';
import { walkDir } from '../../server/walk.js';
import { listWorktrees } from '../../core/worktrees.js';
import { execFile } from 'node:child_process';

interface Stats {
  root: string;
  files: number;
  dirs: number;
  totalSize: number;
  byExt: { ext: string; count: number }[];
  markdown: number;
  openspec: { active: number; archived: number };
  hasJust: boolean;
  worktrees: number;
  branch?: string;
  dirty?: number;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);

function execFilePromise(file: string, args: string[], opts: { cwd: string }): Promise<string> {
  return new Promise((resolve) => {
    execFile(file, args, opts, (err, stdout) => resolve(err ? '' : stdout));
  });
}

function scan(root: string): Stats {
  const stats: Stats = {
    root: path.basename(root),
    files: 0,
    dirs: 0,
    totalSize: 0,
    byExt: [],
    markdown: 0,
    openspec: { active: 0, archived: 0 },
    hasJust: fs.existsSync(path.join(root, 'justfile')),
    worktrees: 0,
  };
  const extMap = new Map<string, number>();

  const walk = (dir: string) => {
    walkDir(dir, { skip: SKIP_DIRS, onDir: () => { stats.dirs++; }, onFile: (abs) => {
      stats.files++;
      try { stats.totalSize += fs.statSync(abs).size; } catch {}
      const ext = path.extname(abs).toLowerCase() || '(无扩展名)';
      extMap.set(ext, (extMap.get(ext) ?? 0) + 1);
      if (ext === '.md' || ext === '.markdown') stats.markdown++;
    }});
  };
  walk(root);

  const changesDir = path.join(root, 'openspec', 'changes');
  if (fs.existsSync(changesDir)) {
    for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      if (ent.name === 'archive') {
        try {
          stats.openspec.archived = fs.readdirSync(path.join(changesDir, 'archive'), { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith('.')).length;
        } catch { /* ignore */ }
      } else stats.openspec.active++;
    }
  }

  stats.byExt = Array.from(extMap.entries())
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return stats;
}

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    ctx.inject(['server', 'dashboard'], () => {
      const server = (ctx as any).server;
      const dashboard = (ctx as any).dashboard;
      if (!server?.route || !dashboard?.register) return;

      dashboard.register({
        mode: 'stats',
        label: '项目统计',
        icon: '📊',
        description: '项目文件统计 · 扫描生成',
      });

      server.route('/__stats/data', async (_req: unknown, res: import('node:http').ServerResponse) => {
        const stats = scan(config.root);
        try {
          const wts = await listWorktrees(config.root);
          stats.worktrees = wts.length;
        } catch {
          stats.worktrees = 0;
        }
        try {
          const branchOut = await execFilePromise('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: config.root });
          stats.branch = branchOut.trim() || undefined;
        } catch { /* ignore */ }
        try {
          const statusOut = await execFilePromise('git', ['status', '--porcelain'], { cwd: config.root });
          stats.dirty = statusOut.trim() ? statusOut.trim().split('\n').length : 0;
        } catch { /* ignore */ }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(stats));
      });
    });
  },
};
