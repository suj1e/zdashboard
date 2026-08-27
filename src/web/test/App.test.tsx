/**
 * B2 回归:宿主(App)渲染非 legacy(defineWebPlugin/SDK 形状)插件的 Workspace 时,
 * 必须把路由 URLSearchParams 以 params 注入(JSDoc 承诺「由 router 注入」的唯一落点)。
 *
 * usePlugins 打桩替换真实 import.meta.glob 与六内置插件,只验证接线本身。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/** 记录桩 Workspace 收到的全部 props(vi.hoisted 保证 mock 工厂可引用) */
const h = vi.hoisted(() => {
  const workspaceProps: Array<Record<string, unknown>> = [];
  return { workspaceProps };
});

vi.mock('../lib/plugins.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/plugins.js')>();
  function StubWorkspace(props: Record<string, unknown>) {
    h.workspaceProps.push(props);
    return <div data-testid="stub-workspace">stub workspace</div>;
  }
  return {
    ...actual,
    usePlugins: () => [
      {
        mode: 'stubmode',
        label: 'Stub Mode',
        icon: '▣',
        description: 'non-legacy stub',
        legacy: false as const,
        Workspace: StubWorkspace,
      },
    ],
  };
});

// vi.mock 提升到顶部,此处的实际导入拿到的是打桩后的模块
import App from '../App.js';
import { TooltipProvider } from '../components/ui/tooltip.js';

/** jsdom 无 EventSource,壳层挂载会建 /__reload 连接,给个可 close、可挂监听的空壳 */
class FakeES {
  static instances: FakeES[] = [];
  listeners = new Map<string, Set<(e: unknown) => void>>();
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(name: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: unknown) => void) { this.listeners.get(name)?.delete(fn); }
  close(): void {}
}

beforeEach(() => {
  h.workspaceProps.length = 0;
  window.history.replaceState(null, '', '/?p=stubmode&wt=/tmp/b2');
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('App — Workspace params 注入(B2)', () => {
  it('非 legacy 插件 Workspace 收到宿主注入的 URLSearchParams', async () => {
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    // 挂载进入 ?p=stubmode 路由并渲染桩工作区
    expect(await screen.findByTestId('stub-workspace')).toBeInTheDocument();

    const props = h.workspaceProps.at(-1)!;
    expect(props.params).toBeInstanceOf(URLSearchParams);
    const params = props.params as URLSearchParams;
    expect(params.get('p')).toBe('stubmode');
    expect(params.get('wt')).toBe('/tmp/b2');
  });
});
