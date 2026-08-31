import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveThemeBoot, MODE_KEY, THEME_KEY, LEGACY_THEME_KEY } from '../../lib/themeBoot.js';

/**
 * index.html 内联 FOUC 脚本是 themeBoot.resolveThemeBoot 的手写镜像(内联无法走 bundle)。
 * 此处把真实 index.html 里的内联脚本抽出来在 jsdom 执行,断言:
 * 1) 它存在于 <head> 且先于 bundle module 脚本;
 * 2) 各存储状态下写入的 dataset 与纯函数结果逐字段一致(镜像不漂移);
 * 3) localStorage 抛异常时被 try/catch 吞掉(不阻塞解析)。
 */

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
expect(headMatch, 'index.html 应有 <head>').toBeTruthy();
const head = headMatch![1];

const inlineScripts = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
expect(inlineScripts.length, 'head 内联脚本应恰好一个(FOUC 预置)').toBe(1);
const inlineScript = inlineScripts[0];

// 内联脚本必须出现在 module bundle 引用之前,才能赶在首帧前执行
const inlineIdx = html.indexOf('<script>');
const moduleIdx = html.indexOf('<script type="module"');
expect(moduleIdx, 'index.html 应有 module 脚本引用').toBeGreaterThan(-1);
expect(inlineIdx).toBeGreaterThan(-1);
expect(inlineIdx).toBeLessThan(moduleIdx);

/** 在当前 jsdom 环境执行内联脚本(.document/localStorage 即全局) */
function runInline() {
  // eslint-disable-next-line no-new-func
  new Function(inlineScript)();
}

function fakeStorage(init: Record<string, string>) {
  const m = new Map(Object.entries(init));
  const shim = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() { return m.size; },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: shim });
  return shim;
}

describe('index.html 内联 FOUC 脚本(镜像一致性)', () => {
  const states: [string, Record<string, string>][] = [
    ['全新环境', {}],
    ['深色+pixel', { [MODE_KEY]: 'dark', [THEME_KEY]: 'pixel' }],
    ['浅色+slate', { [MODE_KEY]: 'light', [THEME_KEY]: 'slate' }],
    ['legacy light 迁移', { [LEGACY_THEME_KEY]: 'light' }],
    ['非法值兜底', { [MODE_KEY]: 'purple', [THEME_KEY]: 'nord' }],
  ];

  it.each(states)('%s: dataset 与 resolveThemeBoot 一致', (_name, init) => {
    // 以纯函数在镜像 storage 上的结果为基准
    const mirror = new Map(Object.entries(init));
    const expected = resolveThemeBoot({
      getItem: (k: string) => mirror.get(k) ?? null,
      setItem: (k: string, v: string) => void mirror.set(k, v),
      removeItem: (k: string) => void mirror.delete(k),
    });

    fakeStorage(init);
    document.documentElement.dataset.mode = '';
    document.documentElement.dataset.theme = '';
    runInline();

    expect(document.documentElement.dataset.mode).toBe(expected.mode);
    expect(document.documentElement.dataset.theme).toBe(expected.theme);
  });

  it('深色冷启动:无任何存储时首帧即 data-mode=dark(无浅色闪屏的机制保证)', () => {
    fakeStorage({});
    runInline();
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('localStorage 抛异常时 try/catch 吞掉,脚本不阻塞解析', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage blocked'); },
    });
    expect(() => runInline()).not.toThrow();
  });
});
