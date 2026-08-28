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
      {
        // apply-batch 旧直达兼容重定向的落点(?p=apply&view=batch → 批量 Tab)
        mode: 'apply',
        label: 'Apply',
        icon: '◫',
        description: 'apply stub',
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
  vi.restoreAllMocks();
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

describe('App — ?p=apply-batch 兼容重定向(zskills 新约定)', () => {
  it('?p=apply-batch replace 重定向为 ?p=apply&view=batch,不渲染首页', async () => {
    window.history.replaceState(null, '', '/?p=apply-batch');
    // replace 语义:不新增历史记录(先设 URL 再挂 spy)
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    // 落点:apply 插件的 Workspace,URL params view=batch(批量 Tab)
    expect(await screen.findByTestId('stub-workspace')).toBeInTheDocument();
    const params = h.workspaceProps.at(-1)!.params as URLSearchParams;
    expect(params.get('p')).toBe('apply');
    expect(params.get('view')).toBe('batch');
    expect(new URLSearchParams(window.location.search).get('view')).toBe('batch');
    // 不渲染首页
    expect(screen.queryByText('探测')).not.toBeInTheDocument();
    // replace 语义:仅 replaceState,无 pushState
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalled();
  });

  it('其余未知 mode(?p=nope)仍回落首页,URL 不被改写', async () => {
    window.history.replaceState(null, '', '/?p=nope');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    expect(await screen.findByText('探测')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-workspace')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('p')).toBe('nope');
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('IconRail 仅渲染注册表中的插件入口(无 apply-batch 项)', async () => {
    window.history.replaceState(null, '', '/');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    // 首页(非插件路由)下 rail 首页钮 + 每个注册插件一钮;注册表无 apply-batch → 无该入口
    expect(await screen.findByText('探测')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apply-batch' })).not.toBeInTheDocument();
  });
});
