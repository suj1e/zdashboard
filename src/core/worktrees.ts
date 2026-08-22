import { execFile } from 'node:child_process';
import type { Context } from 'cordis';

export interface WorktreeInfo {
  path: string;
  name: string;
  branch: string;
  head: string;
  dirty: boolean;
}

const GIT_TIMEOUT_MS = 5_000;
const ZWORKTREE_SEGMENT = '.zworktree/';

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: GIT_TIMEOUT_MS }, (err, stdout) => {
      if (err) return resolve('');
      resolve(stdout);
    });
  });
}

export async function listWorktrees(root: string): Promise<WorktreeInfo[]> {
  const raw = await runGit(['worktree', 'list', '--porcelain'], root);
  if (!raw) return [];

  const entries: WorktreeInfo[] = [];
  const lines = raw.split('\n');
  let current: Partial<WorktreeInfo> = {};

  for (const line of lines) {
    const m = line.match(/^(worktree|HEAD|branch|detached)\s+(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'worktree') {
      if (current.path && current.path.includes(ZWORKTREE_SEGMENT)) {
        entries.push({
          path: current.path,
          name: current.path.split(ZWORKTREE_SEGMENT).pop() ?? '',
          branch: current.branch ?? '',
          head: current.head ?? '',
          dirty: false,
        });
      }
      current = { path: val, head: '', branch: '' };
    } else if (key === 'HEAD') {
      current.head = val;
    } else if (key === 'branch') {
      current.branch = val.replace(/^refs\/heads\//, '');
    }
  }

  // flush last entry
  if (current.path && current.path.includes(ZWORKTREE_SEGMENT)) {
    entries.push({
      path: current.path,
      name: current.path.split(ZWORKTREE_SEGMENT).pop() ?? '',
      branch: current.branch ?? '',
      head: current.head ?? '',
      dirty: false,
    });
  }

  // dirty detection: git status --porcelain 非空即 dirty（失败默认 false）
  await Promise.all(
    entries.map(async (entry) => {
      try {
        const statusOut = await runGit(['status', '--porcelain'], entry.path);
        entry.dirty = statusOut.trim().length > 0;
      } catch {
        entry.dirty = false;
      }
    })
  );

  return entries;
}

export const apply = {
  inject: ['server'] as const,
  apply(ctx: Context, config: { root: string }) {
    const server = ctx.server;
    if (!server?.route) return;

    server.route('/__worktrees', async (_req, res) => {
      try {
        const entries = await listWorktrees(config.root);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(entries));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify([]));
      }
    });
  },
};
