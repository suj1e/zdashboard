/**
 * B2 回归:宿主(App)渲染非 legacy(defineWebPlugin/SDK 形状)插件的 Workspace 时,
 * 必须把路由 URLSearchParams 以 params 注入(JSDoc 承诺「由 router 注入」的唯一落点)。
 *
 * usePlugins 打桩替换真实 import.meta.glob,以 stub 插件只验证接线本身。
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

describe('App — 非法 mode 回首页(含已删 apply 插件深链接)', () => {
  it.each(['apply', 'apply-batch', 'nope'])('?p=%s 回落首页,URL 不被改写', async (mode) => {
    window.history.replaceState(null, '', `/?p=${mode}`);
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    expect(await screen.findByText('探测')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-workspace')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('p')).toBe(mode);
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('IconRail 仅渲染注册表中的插件入口(无 apply/apply-batch 项)', async () => {
    window.history.replaceState(null, '', '/');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    // 首页(非插件路由)下 rail 首页钮 + 每个注册插件一钮;注册表无 apply → 无该入口
    expect(await screen.findByText('探测')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apply' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apply-batch' })).not.toBeInTheDocument();
  });
});

describe('App — SSE reload 事件不再整页刷新(reload 闪烁修复)', () => {
  /**
   * jsdom 将 window.location.reload 标记为 [Unforgeable](own non-configurable),
   * 无法 vi.spyOn/重定义;其调用经 virtualConsole 同步转发为
   * console.error('Error: Not implemented: window.location.reload'),
   * 以此作为「reload 被触发」的可观测信号。
   */
  function stubReloadSignal() {
    const errSpy = vi.spyOn(console, 'error');
    return {
      fired: () => errSpy.mock.calls.some((c) => String(c[0]).includes('Not implemented')),
      restore: () => errSpy.mockRestore(),
    };
  }
  /** useSSE 每次挂载新建连接,取最近一个 FakeES 实例 */
  function lastES(): FakeES {
    const es = FakeES.instances.at(-1);
    expect(es).toBeDefined();
    return es!;
  }
  /** 模拟服务端推送具名 SSE 事件 */
  function dispatchSSE(ev: string) {
    for (const fn of lastES().listeners.get(ev) ?? []) fn({ data: '' });
  }

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    FakeES.instances.length = 0;
  });

  it("派发 'reload' SSE 事件后不触发 window.location.reload", () => {
    const signal = stubReloadSignal();
    try {
      render(
        <TooltipProvider>
          <App />
        </TooltipProvider>,
      );
      // 事件确实送达 useSSE 监听器;此刻无 jsdom 未实现噪音
      expect(lastES().listeners.get('reload')?.size).toBeGreaterThan(0);
      expect(signal.fired()).toBe(false);
      dispatchSSE('reload');
      expect(signal.fired()).toBe(false); // 修复后:不再整页 reload
    } finally {
      signal.restore();
    }
  });

  it("派发 'files' SSE 事件同样不触发整页刷新", () => {
    const signal = stubReloadSignal();
    try {
      render(
        <TooltipProvider>
          <App />
        </TooltipProvider>,
      );
      dispatchSSE('files');
      expect(signal.fired()).toBe(false);
    } finally {
      signal.restore();
    }
  });
});
