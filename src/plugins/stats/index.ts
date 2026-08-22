import type { Context } from 'cordis';
import fs from 'node:fs';
import path from 'node:path';

interface Stats {
  root: string;
  files: number;
  dirs: number;
  totalSize: number;
  byExt: { ext: string; count: number }[];
  markdown: number;
  openspec: { active: number; archived: number };
  hasJust: boolean;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);

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
  };
  const extMap = new Map<string, number>();

  const walk = (dir: string) => {
    let ents: fs.Dirent[];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      if (ent.name.startsWith('.') || SKIP_DIRS.has(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) { stats.dirs++; walk(abs); continue; }
      stats.files++;
      try { stats.totalSize += fs.statSync(abs).size; } catch {}
      const ext = path.extname(ent.name).toLowerCase() || '(无扩展名)';
      extMap.set(ext, (extMap.get(ext) ?? 0) + 1);
      if (ext === '.md' || ext === '.markdown') stats.markdown++;
    }
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

      server.route('/__stats/data', (_req: unknown, res: import('node:http').ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(scan(config.root)));
      });
    });
  },
};
