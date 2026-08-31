/**
 * 数据新鲜度 T3(design 侧):design 查看器同规则订阅 SSE files(300ms 防抖),
 * 命中当前资产才失效——viewer 挂载即只对应当前资产,重取/时间戳强制重载只作用于自身。
 * iframe 强制重载仅加时间戳参数,不做全量 key 重挂。
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import TokenViewer from '../viewers/TokenViewer.js';
import PageViewer from '../viewers/PageViewer.js';
import { FontViewer } from '../viewers/misc.js';

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
  // 含至少一个 CSS 变量:TokenViewer 空变量会提前走「未发现 CSS 变量」早退,渲染不出刷新按钮
  fetchMock = vi.fn(async () =>
    ({ ok: true, status: 200, text: async () => ':root { --color-primary: #ff0000; }', blob: async () => new Blob() }) as unknown as Response
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).EventSource;
  vi.restoreAllMocks();
});

describe('TokenViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件(300ms 防抖后)触发重取,多次事件合并为一次', async () => {
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 450));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__design/asset?path=tokens.css');
  });

  it('刷新按钮手动重取当前资产', async () => {
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe('PageViewer — files 命中当前资产 iframe 时间戳强制重载(数据新鲜度 T3)', () => {
  it('初始 src 不带时间戳;files 事件后加时间戳参数(不做 key 重挂)', async () => {
    const { container } = render(<PageViewer path="home.html" />);
    const iframe = () => container.querySelector('iframe')!;
    expect(iframe().getAttribute('src')).toBe('/__design/asset?path=' + encodeURIComponent('home.html'));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(iframe().getAttribute('src')).toContain('&v='), { timeout: 3000 });
    // 同一 iframe 节点未被重挂(仅 src 变更)
    expect(container.querySelector('iframe')).toBe(iframe());
  });

  it('刷新按钮同样触发时间戳强制重载', async () => {
    const { container } = render(<PageViewer path="home.html" />);
    await waitFor(() => expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(container.querySelector('iframe')!.getAttribute('src')).toContain('&v='));
  });
});

describe('FontViewer — files 订阅重取字体资产(数据新鲜度 T3)', () => {
  it('files 事件触发 blob 重取', async () => {
    render(<FontViewer path="fonts/app.woff2" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__design/asset?path=');
  });
});
