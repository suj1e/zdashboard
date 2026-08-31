/**
 * /__files 约定化扫描路由验收(view 约定化扫描 change):
 * - 扫描目录写死约定 ['openspec','docs','.zdev/apply'](点前缀目录经 dotDirs 显式放行),
 *   不再读 dashboard.getConfig('view');
 *   根下其他目录(src 等)与未列入约定的隐藏目录一律不进树;
 * - wt 参数指向 worktree 绝对路径 → 扫描该根,行为不变;
 * - 无 wt → 扫描项目根。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { Context } from 'cordis';
import { ServerService } from '../server.js';
import { apply as treeApply } from '../tree.js';

interface TreeNode {
  name: string;
  kind: string;
  path?: string;
  children?: TreeNode[];
}

const tmpDirs: string[] = [];
function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-files-'));
  tmpDirs.push(dir);
  return dir;
}
function write(root: string, rel: string, content = 'x'): void {
  const fp = path.join(root, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
}

function boot(root: string): Promise<{ port: number; dispose: () => void }> {
  return new Promise((resolve, reject) => {
    const ctx = new Context();
    ctx.plugin(ServerService, {
      root,
      appDir: root,
      port: 0,
      open: false,
      page: null,
      detect: { hasOpenspec: true, hasDocs: true, hasJust: false },
      onListen: (port: number) => resolve({
        port,
        dispose: () => { try { ctx.root.fiber.dispose(); } catch { /* ignore */ } },
      }),
    });
    ctx.plugin(treeApply, { root });
    setTimeout(() => reject(new Error('server did not start')), 5000);
  });
}

function get(port: number, reqPath: string): Promise<{ status: number | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: reqPath }, (res) => {
      let body = '';
      res.on('data', (c: Buffer) => { body += c.toString(); });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

const groupNames = (tree: TreeNode[]) => tree.map((n) => n.name.replace(/ \(\d+\)$/, ''));

const TMP_CLEANUP_RETRIES = 5;
const TMP_CLEANUP_RETRY_DELAY_MS = 100;

afterEach(async () => {
  // Windows 上 ServerService 启动的 git 子进程(cwd=临时根)句柄延迟释放,rmSync 需重试
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    for (let i = 0; i < TMP_CLEANUP_RETRIES; i++) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, TMP_CLEANUP_RETRY_DELAY_MS));
      }
    }
  }
});

describe('/__files — 约定目录扫描', () => {
  it('仅返回约定目录 openspec/docs 节点,其他目录与隐藏目录不进树', async () => {
    const root = makeProject();
    write(root, 'openspec/project.md');
    write(root, 'docs/README.md');
    write(root, 'src/index.ts');        // 非约定目录
    write(root, '.hidden/secret.txt');  // 隐藏目录

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, '/__files');
      expect(res.status).toBe(200);
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree).sort()).toEqual(['docs', 'openspec']);
      expect(res.body).not.toContain('src');
      expect(res.body).not.toContain('.hidden');
    } finally {
      dispose();
    }
  });

  it('无 wt 参数 → 扫描项目根(当前分支组数据源)', async () => {
    const root = makeProject();
    write(root, 'openspec/specs/x/spec.md');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, '/__files');
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree)).toEqual(['openspec']);
      expect(res.body).toContain('openspec/specs/x/spec.md');
    } finally {
      dispose();
    }
  });

  it('wt 参数指向 worktree 绝对路径 → 扫描该根(行为不变)', async () => {
    const root = makeProject();
    write(root, 'openspec/root.md');

    const wt = makeProject();
    write(wt, 'openspec/wt-spec.md');
    write(wt, 'docs/wt-doc.md');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, `/__files?wt=${encodeURIComponent(wt)}`);
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree).sort()).toEqual(['docs', 'openspec']);
      expect(res.body).toContain('openspec/wt-spec.md');
      expect(res.body).not.toContain('root.md'); // 项目根内容不混入
    } finally {
      dispose();
    }
  });

  it('wt 指向不存在目录 → 空树而非报错', async () => {
    const root = makeProject();
    write(root, 'openspec/root.md');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, `/__files?wt=${encodeURIComponent(path.join(root, 'nope'))}`);
      expect(res.status).toBe(200);
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(tree).toEqual([]);
    } finally {
      dispose();
    }
  });

  it('.zdev/apply 点前缀约定目录(dotDirs 放行)→ 分组出现且可深达 runs/<id>/state.json', async () => {
    const root = makeProject();
    write(root, '.zdev/apply/CURRENT', 'runs/2026-08-28-2128');
    write(root, '.zdev/apply/runs/2026-08-28-2128/state.json', '{}');
    write(root, '.zdev/apply/runs/2026-08-28-2128/plan.md');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, '/__files');
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree)).toContain('.zdev/apply');
      expect(res.body).toContain('.zdev/apply/runs/2026-08-28-2128/state.json');
      expect(res.body).toContain('CURRENT');
    } finally {
      dispose();
    }
  });

  it('.zdev/verify 点前缀约定目录(dotDirs 放行)→ 分组出现且内容可达', async () => {
    const root = makeProject();
    write(root, '.zdev/verify/0831-1200-auth/report.md', '# verify');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, '/__files');
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree)).toContain('.zdev/verify');
      expect(res.body).toContain('.zdev/verify/0831-1200-auth/report.md');
    } finally {
      dispose();
    }
  });

  it('.zdev 下未列入约定的目录(如 .zdev/design、.zdev/verify)不进树', async () => {
    const root = makeProject();
    write(root, '.zdev/design/brands/x/DESIGN.md', 'x');
    write(root, '.zdev/verify/report.md', 'y');

    const { port, dispose } = await boot(root);
    try {
      const res = await get(port, '/__files');
      const { tree } = JSON.parse(res.body) as { tree: TreeNode[] };
      expect(groupNames(tree)).not.toContain('.zdev/design');
      expect(groupNames(tree)).not.toContain('.zdev/verify');
    } finally {
      dispose();
    }
  });
});
