/**
 * just-log-ux T4 组件验收:启停反馈与行数截断。
 * - act() 检查 res.ok:非 2xx 读 body error → toast.error,成功 toast.success,网络异常 toast.error;
 * - 启停按钮 pending 禁用:持续到对应 SSE state 事件到达,或 3s 超时兜底解禁;
 * - 行数达到窗口上限 1000 时显示「1000+ 行」。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { toast } from 'sonner';
import { LogViewer } from '../../../web/components/LogViewer.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

class FakeES {
  static instances: FakeES[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
}

const RECIPES = [{ name: 'dev-server', description: 'dev' }];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}
function errJson(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

const nextFrame = () => act(async () => { await new Promise(r => requestAnimationFrame(r)); });

function emitLog(es: FakeES, text: string) {
  es.onmessage?.({ data: JSON.stringify({ type: 'log', recipe: 'dev-server', text }) });
}
function emitState(es: FakeES, state: 'running' | 'exited', extra: Record<string, unknown> = {}) {
  es.onmessage?.({ data: JSON.stringify({ type: 'state', recipe: 'dev-server', state, code: state === 'running' ? null : 0, startedAt: Date.now(), ...extra }) });
}

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
  __resetPluginDataForTest();
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
    if (url.includes('/__just/recipes')) return okJson(RECIPES);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountRunning() {
  render(<LogViewer />);
  const es = FakeES.instances.at(-1)!;
  act(() => { es.onopen?.(); });
  act(() => { emitState(es, 'running'); });
  await act(async () => { await Promise.resolve(); });
  return es;
}

describe('LogViewer 启停反馈 — res.ok 检查与 toast', () => {
  it('start 返回 400 {error} → toast.error 携带服务端错误信息,按钮解禁', async () => {
    await mountRunning();
    emitState(FakeES.instances.at(-1)!, 'exited'); // 转为已退出 → 出现启动按钮
    await act(async () => { await Promise.resolve(); });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__just/start')) return errJson(400, { error: 'unknown recipe' });
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (url.includes('/__just/recipes')) return okJson(RECIPES);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const btn = screen.getByRole('button', { name: /重跑|启动/ });
    await act(async () => { fireEvent.click(btn); });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(toast.error).mock.calls[0][0])).toContain('unknown recipe');
    expect(btn).toBeEnabled(); // 失败立即解禁(旧实现无 res.ok 检查 → 无 toast → 红)
  });

  it('start 返回 2xx → toast.success 轻文案', async () => {
    await mountRunning();
    emitState(FakeES.instances.at(-1)!, 'exited');
    await act(async () => { await Promise.resolve(); });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__just/start')) return okJson([]);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (url.includes('/__just/recipes')) return okJson(RECIPES);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /重跑|启动/ })); });
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(toast.success).mock.calls[0][0])).toContain('dev-server');
  });

  it('网络异常 → toast.error(不再静默)', async () => {
    await mountRunning();
    emitState(FakeES.instances.at(-1)!, 'exited');
    await act(async () => { await Promise.resolve(); });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down'); }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /重跑|启动/ })); });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});

describe('LogViewer 启停反馈 — pending 禁用至 state 事件或 3s 超时', () => {
  it('停止 2xx → 按钮禁用;SSE state exited 到达 → 解禁', async () => {
    const es = await mountRunning();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__just/stop')) return okJson([]);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (url.includes('/__just/recipes')) return okJson(RECIPES);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const stopBtn = screen.getByRole('button', { name: /停止/ });
    await act(async () => { fireEvent.click(stopBtn); });
    expect(stopBtn).toBeDisabled(); // pending 至 state 事件(旧实现无 pending → 红)

    act(() => { emitState(es, 'exited'); });
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('button', { name: /重跑/ })).toBeEnabled();
  });

  it('启动 2xx → 按钮禁用;3s 超时兜底解禁(state 迟迟不到)', async () => {
    vi.useFakeTimers();
    const es = await mountRunning();
    act(() => { emitState(es, 'exited'); });
    await act(async () => { await Promise.resolve(); });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__just/start')) return okJson([]);
      if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
      if (url.includes('/__just/recipes')) return okJson(RECIPES);
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const btn = screen.getByRole('button', { name: /重跑|启动/ });
    await act(async () => { fireEvent.click(btn); });
    expect(btn).toBeDisabled();

    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(btn).toBeEnabled();
  });
});

describe('LogViewer 行数截断显示', () => {
  it('行数达到窗口上限 1000 → 头部显示「1000+ 行」', async () => {
    const es = await mountRunning();
    act(() => { for (let i = 0; i < 1001; i++) emitLog(es, `row ${i}\n`); });
    await nextFrame();
    expect(screen.getByText('1000+ 行')).toBeInTheDocument(); // 旧实现恒「N 行」→ 红
  });

  it('行数未达上限 → 显示「N 行」', async () => {
    const es = await mountRunning();
    act(() => { for (let i = 0; i < 12; i++) emitLog(es, `row ${i}\n`); });
    await nextFrame();
    expect(screen.getByText('12 行')).toBeInTheDocument();
  });
});
