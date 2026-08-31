/**
 * 数据新鲜度 T3:viewer 订阅 SSE files 事件(300ms 防抖)重取当前 path + 工具栏手动刷新按钮。
 *
 * 服务端 broadcast('files') 不带路径(payload 恒空串),viewer 挂载即只对应「当前资产」,
 * 重取自己当前 path 即「命中当前资产才失效」的落地形态;断线重连补偿同样派发空 payload,走同一订阅。
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MdViewer } from '../../viewers/MdViewer.js';
import { CodeViewer } from '../../viewers/CodeViewer.js';

/** jsdom 无 EventSource;emit 手工派发服务端 SSE 帧(payload 恒 '') */
class FakeES {
  static instances: FakeES[] = [];
  listeners = new Map<string, Set<(e: unknown) => void>>();
  closed = false;
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(name: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: unknown) => void) { this.listeners.get(name)?.delete(fn); }
  close() { this.closed = true; }
  emit(name: string, data: unknown) { this.listeners.get(name)?.forEach((fn) => fn({ data })); }
}

let fetchMock: Mock;

beforeEach(() => {
  (globalThis as Record<string, unknown>).EventSource = FakeES;
  fetchMock = vi.fn(async () =>
    ({ ok: true, status: 200, text: async () => '# hello' }) as unknown as Response
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).EventSource;
  vi.restoreAllMocks();
});

describe('MdViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件(300ms 防抖后)触发重取当前 path', async () => {
    render(<MdViewer path="docs/a.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/docs/a.md');
  });

  it('300ms 防抖窗口内多次 files 事件合并为一次重取', async () => {
    render(<MdViewer path="docs/b.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); es.emit('files', ''); es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    // 等过防抖窗口,确认合并后没有第三次请求
    await new Promise((r) => setTimeout(r, 450));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('工具栏刷新按钮手动重取当前 path', async () => {
    render(<MdViewer path="docs/c.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/docs/c.md');
  });
});

describe('CodeViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件触发重取 + 工具栏刷新按钮可用', async () => {
    render(<CodeViewer path="src/app.ts" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/src/app.ts');

    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(String(fetchMock.mock.calls[2][0])).toContain('/__file-content/src/app.ts');
  });
});
