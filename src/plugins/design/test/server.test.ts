/**
 * T4 design server 验收:manifest.config 单源(多文件夹 folders 增删生效)。
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFakeCtx, createRes } from '../../../sdk/test/helpers.js';

function makeRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-'));
  fs.mkdirSync(path.join(root, '.zdev', 'design'), { recursive: true });
  fs.writeFileSync(path.join(root, '.zdev', 'design', 'icon.svg'), '<svg/>');
  fs.mkdirSync(path.join(root, 'custom'), { recursive: true });
  fs.writeFileSync(path.join(root, 'custom', 'token.css'), ':root{--x:#000}');
  fs.writeFileSync(path.join(root, 'custom', 'page.html'), '<html></html>');
  return root;
}

type ScanOut = Record<string, Array<{ path: string }>>;

async function fetchAssets(root: string, storedConfig: Record<string, unknown>) {
  const { ctx, routes } = createFakeCtx({ storedConfig });
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root });
  const res = createRes();
  await routes.get('/__design/assets')!({ headers: {} } as never, res as never);
  return JSON.parse(String(res.body)) as ScanOut;
}

function flatPaths(out: ScanOut): string[] {
  return Object.values(out).flat().map((a) => a.path);
}

describe('design server 路由 — folders 增删生效(manifest.config 单源)', () => {
  it('配置 folders=[custom] → 扫描 custom 而非默认 .zdev/design', async () => {
    const root = makeRoot();
    try {
      const out = await fetchAssets(root, { folders: ['custom'] });
      const paths = flatPaths(out);
      expect(paths).toContain('token.css');
      expect(paths).toContain('page.html');
      expect(paths).not.toContain('icon.svg');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('folders 增删:多文件夹合并扫描', async () => {
    const root = makeRoot();
    try {
      const out = await fetchAssets(root, { folders: ['custom', '.zdev/design'] });
      const paths = flatPaths(out);
      expect(paths).toContain('token.css');
      expect(paths).toContain('page.html');
      expect(paths).toContain('icon.svg');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('folders 删空 → 回落默认 .zdev/design', async () => {
    const root = makeRoot();
    try {
      const out = await fetchAssets(root, {});
      const paths = flatPaths(out);
      expect(paths).toContain('icon.svg');
      expect(paths).not.toContain('token.css');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
