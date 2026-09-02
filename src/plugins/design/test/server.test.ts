/**
 * design server 验收:约定化扫描 —— 恒扫 <root>/.zdev/design,缺失 → 九组空数组。
 * 旧 folders 配置链路已拆除:传入存储配置也不影响扫描范围。
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFakeCtx, createRes } from '../../../sdk/test/helpers.js';

const ASSET_KEYS = ['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font', 'diagram'] as const;

type ScanOut = Record<string, Array<{ path: string }>>;

async function fetchAssets(root: string, storedConfig?: Record<string, unknown>) {
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

describe('design server 路由 — 约定化扫描(.zdev/design 单源)', () => {
  it('目录缺失 → 全部分组(含 diagram)均为空数组', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-missing-'));
    try {
      const out = await fetchAssets(root);
      expect(Object.keys(out).sort()).toEqual([...ASSET_KEYS].sort());
      for (const k of ASSET_KEYS) expect(out[k], k).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('目录存在 → 仅含 .zdev/design 扫描结果,根下约定外目录不入结果', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-'));
    try {
      fs.mkdirSync(path.join(root, '.zdev', 'design', 'icons'), { recursive: true });
      fs.writeFileSync(path.join(root, '.zdev', 'design', 'icons', 'logo.svg'), '<svg/>');
      // 约定外目录:即使存在也不扫
      fs.mkdirSync(path.join(root, 'custom'), { recursive: true });
      fs.writeFileSync(path.join(root, 'custom', 'token.css'), ':root{--x:#000}');
      fs.writeFileSync(path.join(root, 'custom', 'page.html'), '<html></html>');

      const out = await fetchAssets(root);
      const paths = flatPaths(out);
      expect(paths).toContain('icons/logo.svg');
      expect(paths).not.toContain('token.css');
      expect(paths).not.toContain('page.html');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('残留 folders 存储配置 → 忽略,仍恒扫 .zdev/design', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-legacy-'));
    try {
      fs.mkdirSync(path.join(root, '.zdev', 'design'), { recursive: true });
      fs.writeFileSync(path.join(root, '.zdev', 'design', 'icon.svg'), '<svg/>');
      fs.mkdirSync(path.join(root, 'custom'), { recursive: true });
      fs.writeFileSync(path.join(root, 'custom', 'token.css'), ':root{--x:#000}');

      const out = await fetchAssets(root, { folders: ['custom'] });
      const paths = flatPaths(out);
      expect(paths).toContain('icon.svg');
      expect(paths).not.toContain('token.css');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('响应形状不变:ScanResult 全类型分组(契约回归,diagram 在列)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-shape-'));
    try {
      const out = await fetchAssets(root);
      for (const k of ASSET_KEYS) expect(Array.isArray(out[k]), k).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
