import type { Context } from 'cordis';
import { scanApplyChanges, readApplyChange } from './scan.js';
import { execFile } from 'node:child_process';

const GIT_TIMEOUT_MS = 5000;

interface WorktreeEntry {
  path: string;
  name: string;
  branch: string;
  head: string;
}

function gitWorktrees(root: string): Promise<WorktreeEntry[]> {
  return new Promise((resolve) => {
    execFile(
      'git',
      ['worktree', 'list', '--porcelain'],
      { cwd: root, timeout: GIT_TIMEOUT_MS },
      (err, stdout) => {
        if (err) return resolve([]);
        const entries: WorktreeEntry[] = [];
        const lines = stdout.split('\n');
        let current: Partial<WorktreeEntry> = {};
        for (const line of lines) {
          const m = line.match(/^(worktree|HEAD|branch|detached)\s+(.+)$/);
          if (m) {
            const [, key, val] = m;
            if (key === 'worktree') {
              if (current.path && current.path.includes('.zworktree/')) {
                entries.push({
                  path: current.path,
                  name: current.path.split('/.zworktree/').pop() ?? '',
                  branch: current.branch ?? '',
                  head: current.head ?? '',
                });
              }
              current = { path: val, head: '', branch: '' };
            } else if (key === 'HEAD') {
              current.head = val;
            } else if (key === 'branch') {
              current.branch = val.replace(/^refs\/heads\//, '');
            }
          }
        }
        // flush last entry
        if (current.path && current.path.includes('.zworktree/')) {
          entries.push({
            path: current.path,
            name: current.path.split('/.zworktree/').pop() ?? '',
            branch: current.branch ?? '',
            head: current.head ?? '',
          });
        }
        resolve(entries);
      },
    );
  });
}

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
        if (name.includes('..') || name.includes('/') || name.includes('\\')) {
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

      ctx.server.route('/__worktrees', async (_req, res) => {
        try {
          const entries = await gitWorktrees(root);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(entries));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify([]));
        }
      });
    });
  },
};
