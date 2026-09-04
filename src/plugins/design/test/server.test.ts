/**
 * design server 验收:目录浏览器 —— 恒扫项目根下 prototypes 与 design 两目录,返回目录树。
 * 两目录均缺失 → 空树;.zdev 等约定外目录不进树。
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFakeCtx, createRes } from '../../../sdk/test/helpers.js';

type ScanOut = { tree: Array<{ name: string; kind: string; path?: string; children?: ScanOut['tree'] }> };

async function fetchAssets(root: string) {
  const { ctx, routes } = createFakeCtx({});
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root });
  const res = createRes();
  await routes.get('/__design/assets')!({ headers: {} } as never, res as never);
  return JSON.parse(String(res.body)) as ScanOut;
}

function flatPaths(tree: ScanOut['tree']): string[] {
  const out: string[] = [];
  const walk = (nodes: ScanOut['tree']) => {
    for (const n of nodes) {
      if (n.path) out.push(n.path);
      if (n.children) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

function groupNames(tree: ScanOut['tree']): string[] {
  return tree.map((n) => n.name.replace(/\s\(\d+\)$/, ''));
}

describe('design server 路由 — 目录浏览器(prototypes + design)', () => {
  it('两目录均缺失 → 空树', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-missing-'));
    try {
      const out = await fetchAssets(root);
      expect(out.tree).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('prototypes 存在 → 分组出现且路径带 prototypes/ 前缀', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-proto-'));
    try {
      fs.mkdirSync(path.join(root, 'prototypes', 'login'), { recursive: true });
      fs.writeFileSync(path.join(root, 'prototypes', 'login', 'index.html'), '<html></html>');

      const out = await fetchAssets(root);
      expect(groupNames(out.tree)).toContain('prototypes');
      expect(flatPaths(out.tree)).toContain('prototypes/login/index.html');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('design 与 prototypes 并存 → 两组合并', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-both-'));
    try {
      fs.mkdirSync(path.join(root, 'prototypes', 'login'), { recursive: true });
      fs.writeFileSync(path.join(root, 'prototypes', 'login', 'index.html'), '<html></html>');
      fs.mkdirSync(path.join(root, 'design', 'icons'), { recursive: true });
      fs.writeFileSync(path.join(root, 'design', 'icons', 'logo.svg'), '<svg/>');

      const out = await fetchAssets(root);
      const names = groupNames(out.tree);
      expect(names).toContain('prototypes');
      expect(names).toContain('design');
      const paths = flatPaths(out.tree);
      expect(paths).toContain('prototypes/login/index.html');
      expect(paths).toContain('design/icons/logo.svg');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('约定外目录(.zdev 等)不进树', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-skip-'));
    try {
      fs.mkdirSync(path.join(root, '.zdev', 'design'), { recursive: true });
      fs.writeFileSync(path.join(root, '.zdev', 'design', 'icon.svg'), '<svg/>');
      fs.mkdirSync(path.join(root, 'design'), { recursive: true });
      fs.writeFileSync(path.join(root, 'design', 'a.png'), 'png');

      const out = await fetchAssets(root);
      const paths = flatPaths(out.tree);
      expect(paths).toContain('design/a.png');
      expect(paths.join('\n')).not.toContain('.zdev');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
