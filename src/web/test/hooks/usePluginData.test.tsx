import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  usePluginData,
  notifyPluginEvent,
  peekCache,
  __resetPluginDataForTest,
} from '../../hooks/usePluginData.js';
import { useSSEEvent } from '../../hooks/useSSE.js';

beforeEach(() => { __resetPluginDataForTest(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('usePluginData', () => {
  it('加载成功返回 data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ hello: 1 });
    const { result } = renderHook(() => usePluginData('k1', fetcher));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ hello: 1 }));
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('同组件树并发双挂载同 key 去重为一次请求', async () => {
    let resolveFetch!: (v: number) => void;
    const fetcher = vi.fn().mockReturnValue(new Promise<number>((r) => { resolveFetch = r; }));
    const a = renderHook(() => usePluginData<number>('dup', fetcher));
    const b = renderHook(() => usePluginData<number>('dup', fetcher));
    await act(async () => { resolveFetch(7); });
    await waitFor(() => expect(a.result.current.data).toBe(7));
    expect(b.result.current.data).toBe(7);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('缓存命中:重挂载同 key 直接取缓存不再请求', async () => {
    const fetcher = vi.fn().mockResolvedValue('cached');
    const first = renderHook(() => usePluginData<string>('cache-key', fetcher));
    await waitFor(() => expect(first.result.current.data).toBe('cached'));
    first.unmount();
    const second = renderHook(() => usePluginData<string>('cache-key', fetcher));
    expect(second.result.current.data).toBe('cached');
    expect(second.result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(peekCache('cache-key')).toBe('cached');
  });

  it('subscribe 匹配事件失效缓存并重取,不匹配事件不动', async () => {
    let n = 0;
    const fetcher = vi.fn().mockImplementation(async () => ++n);
    const { result } = renderHook(() =>
      usePluginData<number>('sse-key', fetcher, { subscribe: 'plugin:just:done' })
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => { notifyPluginEvent('plugin:view:done'); });
    expect(result.current.data).toBe(1);
    act(() => { notifyPluginEvent('plugin:just:done'); });
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
    // 失效同时清空缓存条目
    expect(peekCache('sse-key')).toBe(2);
  });

  it('error 态:data 为 null,error 为消息,reload 可恢复', async () => {
    const errFetcher = vi.fn(async () => { throw new Error('boom'); });
    const { result, rerender } = renderHook(({ fetcher }) => usePluginData('err-key', fetcher), {
      initialProps: { fetcher: errFetcher },
    });
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.data).toBeNull();

    // 错误态下 reload:先进入 loading 且错误清空(S3)
    act(() => { result.current.reload(); });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // 新 fetcher(closure 经 rerender 替换)resolve 后:error 保持 null,data 更新为新值
    const okFetcher = vi.fn().mockResolvedValue('fine');
    rerender({ fetcher: okFetcher });
    await waitFor(() => expect(result.current.data).toBe('fine'));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(okFetcher).toHaveBeenCalledTimes(1);
    expect(errFetcher).toHaveBeenCalledTimes(1);
  });

  it('后台重取失败保留旧 data:error 独立字段,不整页清空(数据新鲜度 T2)', async () => {
    let n = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      n += 1;
      if (n === 1) return 'good-value';
      throw new Error('transient 500');
    });
    const { result } = renderHook(() => usePluginData<string>('stale-key', fetcher));
    await waitFor(() => expect(result.current.data).toBe('good-value'));

    // 手动 reload 触发后台重取,失败 → 旧 data 仍在,error 降级为独立字段
    act(() => { result.current.reload(); });
    await waitFor(() => expect(result.current.error).toBe('transient 500'));
    expect(result.current.data).toBe('good-value');
    expect(result.current.loading).toBe(false);

    // 再 reload 恢复成功 → error 清空,data 更新
    act(() => { result.current.reload(); });
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toBe('good-value');
  });

  it('SSE 失效重取失败同样保留旧 data(仅 !data && error 才是全屏错误)', async () => {
    let n = 0;
    const fetcher = vi.fn().mockImplementation(async () => {
      n += 1;
      if (n === 1) return 'first';
      throw new Error('refetch fail');
    });
    const { result } = renderHook(() =>
      usePluginData<string>('sse-stale-key', fetcher, { subscribe: 'plugin:stub:fail' })
    );
    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => { notifyPluginEvent('plugin:stub:fail'); });
    await waitFor(() => expect(result.current.error).toBe('refetch fail'));
    expect(result.current.data).toBe('first');
  });
});

describe('useSSEEvent — 动态频道接线', () => {
  afterEach(() => { delete (globalThis as Record<string, unknown>).EventSource; });

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

  it('注册的 listener 收到插件频道事件,卸载时移除', async () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    const handler = vi.fn();
    const { unmount } = renderHook(() => useSSEEvent('plugin:just:log', handler));
    const es = FakeES.instances.at(-1)!;
    expect(es.url).toBe('/__reload');
    es.emit('plugin:just:log', 'payload');
    expect(handler).toHaveBeenCalledWith('payload');
    unmount();
    es.emit('plugin:just:log', 'again');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('事件到达触发对应 key 的失效(usePluginData 通路)', async () => {
    (globalThis as Record<string, unknown>).EventSource = FakeES;
    let n = 10;
    const fetcher = vi.fn().mockImplementation(async () => ++n);
    const data = renderHook(() => usePluginData<number>('es-key', fetcher, { subscribe: 'plugin:stub:x' }));
    await waitFor(() => expect(data.result.current.data).toBe(11));
    const es = FakeES.instances.at(-1)!;
    es.emit('plugin:stub:x', '');
    await waitFor(() => expect(data.result.current.data).toBe(12));
  });
});
