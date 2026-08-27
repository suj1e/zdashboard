import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  normalizeWebExport,
  comparePlugins,
  collectPlugins,
  type WebPlugin,
} from '../../lib/plugins.js';

const noop = () => null;

/** 旧 web.tsx 形状(default export 直接是 WebPlugin 对象) */
function legacyExport(mode: string, extra: Partial<WebPlugin> = {}): unknown {
  return {
    mode,
    label: `${mode} label`,
    icon: '✳',
    Workspace: noop,
    ...extra,
  };
}

/** 新 SDK defineWebPlugin 返回形状 */
function sdkExport(mode: string, order?: number): unknown {
  const manifest: Record<string, unknown> = { mode, label: `sdk ${mode}`, icon: '▣' };
  if (order !== undefined) manifest.order = order;
  return { manifest, workspace: noop };
}

describe('normalizeWebExport — 旧形状兼容分支', () => {
  it('旧 default export(mode/label/icon/Workspace)原样通过', () => {
    const p = normalizeWebExport(legacyExport('stats'));
    expect(p).not.toBeNull();
    expect(p!.mode).toBe('stats');
    expect(p!.label).toBe('stats label');
    expect(p!.Workspace).toBe(noop);
    expect(p!.legacy).toBe(true);
  });

  it('新 SDK 导出(manifest+workspace)展开为扁平 WebPlugin', () => {
    const p = normalizeWebExport(sdkExport('view', 20));
    expect(p!.mode).toBe('view');
    expect(p!.label).toBe('sdk view');
    expect(p!.icon).toBe('▣');
    expect(p!.order).toBe(20);
    expect(p!.Workspace).toBe(noop);
    expect(p!.legacy).toBe(false);
  });

  it('非法导出(null/缺 mode)返回 null 由注册表跳过', () => {
    expect(normalizeWebExport(null)).toBeNull();
    expect(normalizeWebExport({ label: 'x' })).toBeNull();
    expect(normalizeWebExport({ mode: 'x' })).toBeNull(); // 缺 Workspace
  });

  it('回归:真实 React.lazy 的 Workspace 是 $$typeof 对象而非 function,必须被接受', () => {
    const LazyWs = React.lazy(() => Promise.resolve({ default: noop }));
    const p = normalizeWebExport({ mode: 'view', label: 'v', icon: 'i', Workspace: LazyWs });
    expect(p).not.toBeNull();
    expect(p!.mode).toBe('view');
    const sdk = normalizeWebExport({ manifest: { mode: 's', label: 's', icon: 'i' }, workspace: LazyWs });
    expect(sdk).not.toBeNull();
    expect(sdk!.legacy).toBe(false);
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
    const b = { mode: 'apply-batch', order: 10 } as WebPlugin;
    expect(comparePlugins(a, b)).toBeLessThan(0);
  });
});

describe('collectPlugins — glob 收集与排序', () => {
  it('按模块路径收集、跳过失败加载器并输出排好序的列表', async () => {
    const loaders: [string, () => Promise<unknown>][] = [
      ['/plugins/view/web.tsx', () => Promise.resolve({ default: sdkExport('view', 20) })],
      ['/plugins/stats/web.tsx', () => Promise.resolve({ default: legacyExport('stats') })],
      ['/plugins/design/web.tsx', () => Promise.reject(new Error('boom'))],
      ['/plugins/apply-batch/web.tsx', () => Promise.resolve({ default: sdkExport('apply-batch', 45) })],
      ['/plugins/broken/web.tsx', () => Promise.resolve({})],
    ];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const list = await collectPlugins(loaders);
    spy.mockRestore();
    // design 加载失败被跳过,broken 非法导出被跳过
    // view(20) < apply-batch(45) 有序在前;stats 缺 order 排尾
    expect(list.map((p) => p.mode)).toEqual(['view', 'apply-batch', 'stats']);
    expect((list[2] as WebPlugin).legacy).toBe(true);        // stats 走旧形状兼容分支
    expect((list[0] as WebPlugin).order).toBe(20);           // view 来自 manifest.order
  });
});
