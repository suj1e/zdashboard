/**
 * ux-low-batch T2 reduced-motion 验收:
 * - CSS 断言:globals.css 必须提供 @media (prefers-reduced-motion: reduce) 全局规则,
 *   关闭 animate-pulse(装饰动画)与 hover:scale(位移动画);
 * - 组件断言:usePrefersReducedMotion 为 true 时,StatusBar live 点不再携带 animate-pulse 类
 *   (静态 success 色,CONN_DOT.live 单源),connecting/lost 语义不变。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { render, screen, act } from '@testing-library/react';
import { StatusBar } from '../layout/StatusBar.js';
import { TooltipProvider } from '../components/ui/tooltip.js';
import { FakeES } from './helpers/fake-es.js';

const globals = readFileSync(join(resolve(process.cwd(), 'src'), 'web', 'globals.css'), 'utf8');

describe('globals.css — prefers-reduced-motion 全局规则(CSS 断言)', () => {
  it('存在 @media (prefers-reduced-motion: reduce) 块', () => {
    expect(globals).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('块内关闭 animate-pulse(animation: none)', () => {
    const m = globals.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(m, '缺少 reduce 媒体查询块').toBeTruthy();
    expect(m![1]).toMatch(/\.animate-pulse\s*\{[^}]*animation:\s*none/);
  });

  it('块内关闭 hover:scale(transform: none)', () => {
    const m = globals.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(m).toBeTruthy();
    expect(m![1]).toMatch(/\[class\*="hover:scale"\]:hover\s*\{[^}]*transform:\s*none/);
  });
});

/** jsdom 的 matchMedia 恒 matches:false;stub 指定查询的 matches 以模拟系统 reduce 偏好 */
function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) }) as unknown as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StatusBar — live 点 reduced-motion 静态化', () => {
  it('reduce=true → live 点无 animate-pulse 类,仍为 bg-success 静态色', () => {
    stubMatchMedia(true);
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    act(() => { FakeES.instances.at(-1)!.onopen?.(); }); // 进入 live
    const chip = screen.getByText('SSE');
    const dot = chip.querySelector("span") as HTMLElement;
    expect(dot.className).toContain('bg-success');
    expect(dot.className).not.toContain('animate-pulse');
  });

  it('reduce=false(默认)→ live 点保留 animate-pulse(不回归)', () => {
    stubMatchMedia(false);
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    act(() => { FakeES.instances.at(-1)!.onopen?.(); });
    const chip = screen.getByText('SSE');
    const dot = chip.querySelector("span") as HTMLElement;
    expect(dot.className).toContain('animate-pulse');
  });

  it('reduce=true 且 lost → 点仍 bg-warning(错误信号不因 reduce 弱化)', () => {
    stubMatchMedia(true);
    render(
      <TooltipProvider>
        <StatusBar projectPath="/tmp/demo" />
      </TooltipProvider>,
    );
    act(() => {
      const es = FakeES.instances.at(-1)!;
      es.onopen?.();
      es.onerror?.();
    });
    const chip = screen.getByText('重连中');
    const dot = chip.querySelector("span") as HTMLElement;
    expect(dot.className).toContain('bg-warning');
  });
});
