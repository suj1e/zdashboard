import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  normalizeWebExport,
  comparePlugins,
  collectPlugins,
  type WebPlugin,
} from '../../lib/plugins.js';

const noop = () => null;

/** 旧 web.tsx 形状(plugin-platform-plugins T7 起不再接受) */
function legacyExport(mode: string): unknown {
  return {
    mode,
    label: `${mode} label`,
    icon: '✳',
    Workspace: noop,
  };
}

/** 新 SDK defineWebPlugin 返回形状 */
function sdkExport(mode: string, order?: number): unknown {
  const manifest: Record<string, unknown> = { mode, label: `sdk ${mode}`, icon: '▣' };
  if (order !== undefined) manifest.order = order;
  return { manifest, workspace: noop };
}

describe('normalizeWebExport — 仅接受 SDK defineWebPlugin 形状', () => {
  it('T7:旧 default export(mode/label/icon/Workspace)被拒(兼容分支已删除)', () => {
    expect(normalizeWebExport(legacyExport('stats'))).toBeNull();
  });

  it('新 SDK 导出(manifest+workspace)展开为扁平 WebPlugin', () => {
    const p = normalizeWebExport(sdkExport('view', 20));
    expect(p!.mode).toBe('view');
    expect(p!.label).toBe('sdk view');
    expect(p!.icon).toBe('▣');
    expect(p!.order).toBe(20);
    expect(p!.Workspace).toBe(noop);
  });

  it('非法导出(null/缺 mode)返回 null 由注册表跳过', () => {
    expect(normalizeWebExport(null)).toBeNull();
    expect(normalizeWebExport({ label: 'x' })).toBeNull();
    expect(normalizeWebExport({ mode: 'x' })).toBeNull(); // 缺 Workspace
  });

  it('回归:真实 React.lazy 的 Workspace 是 $$typeof 对象而非 function,必须被接受', () => {
    const LazyWs = React.lazy(() => Promise.resolve({ default: noop }));
    const sdk = normalizeWebExport({ manifest: { mode: 's', label: 's', icon: 'i' }, workspace: LazyWs });
    expect(sdk).not.toBeNull();
    expect(sdk!.mode).toBe('s');
  });
});

describe('comparePlugins — manifest.order 排序', () => {
  it('显式 order 升序排列', () => {
    const a = { mode: 'a', order: 20 } as WebPlugin;
    const b = { mode: 'b', order: 10 } as WebPlugin;
    expect(comparePlugins(b, a)).toBeLessThan(0); // b(order=10) 在前
  });

  it('缺省 order 的插件排在有序插件之后并按字母序', () => {
    const ordered = { mode: 'zz', order: 10 } as WebPlugin;
    const freeA = { mode: 'apple' } as WebPlugin;
    const freeB = { mode: 'banana' } as WebPlugin;
    expect(comparePlugins(freeA, ordered)).toBeGreaterThan(0); // 有序在前
    expect(comparePlugins(freeB, freeA)).toBeGreaterThan(0);   // 无序间字母序
  });

  it('同 order 时按字母序稳定', () => {
    const a = { mode: 'apply', order: 10 } as WebPlugin;
    const b = { mode: 'zeta', order: 10 } as WebPlugin;
    expect(comparePlugins(a, b)).toBeLessThan(0);
  });
});

describe('collectPlugins — glob 收集与排序', () => {
  it('按模块路径收集、跳过失败加载器并输出排好序的列表', async () => {
    const loaders: [string, () => Promise<unknown>][] = [
      ['/plugins/view/web.tsx', () => Promise.resolve({ default: sdkExport('view', 20) })],
      ['/plugins/stats/web.tsx', () => Promise.resolve({ default: sdkExport('stats') })],
      ['/plugins/design/web.tsx', () => Promise.reject(new Error('boom'))],
      ['/plugins/zeta/web.tsx', () => Promise.resolve({ default: sdkExport('zeta', 45) })],
      ['/plugins/broken/web.tsx', () => Promise.resolve({})],
    ];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const list = await collectPlugins(loaders);
    spy.mockRestore();
    // design 加载失败被跳过,broken 非法导出被跳过
    // view(20) < zeta(45) 有序在前;stats 缺 order 排尾
    expect(list.map((p) => p.mode)).toEqual(['view', 'zeta', 'stats']);
    expect(list[0].order).toBe(20); // view 来自 manifest.order
  });

  it('T7:并行加载——总耗时接近最慢单个加载器而非串行累加', async () => {
    const delay = (ms: number) => () => new Promise((r) => setTimeout(r, ms));
    const loaders: [string, () => Promise<unknown>][] = [
      ['/plugins/slow/web.tsx', () => delay(60)().then(() => ({ default: sdkExport('slow', 1) }))],
      ['/plugins/fast/web.tsx', () => delay(10)().then(() => ({ default: sdkExport('fast', 2) }))],
      ['/plugins/mid/web.tsx', () => delay(30)().then(() => ({ default: sdkExport('mid', 3) }))],
    ];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const start = Date.now();
    const list = await collectPlugins(loaders);
    const elapsed = Date.now() - start;
    spy.mockRestore();
    expect(list.map((p) => p.mode)).toEqual(['slow', 'fast', 'mid']);
    // 串行需 ≥100ms;并行应 ≈60ms(留出裕量)
    expect(elapsed).toBeLessThan(95);
  });
});
