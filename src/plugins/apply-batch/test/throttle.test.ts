/**
 * T6 apply-batch 单测:SSE 广播 500ms 节流(窗口合并)+ 写路由鉴权 + store 变更广播。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createThrottledBroadcast } from '../throttle.js';

describe('createThrottledBroadcast — 500ms 窗口合并', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('窗口内多次变更只推首即时 + 尾补发', () => {
    const fn = vi.fn();
    const push = createThrottledBroadcast(fn, 500);
    push(); // t=0 立即
    expect(fn).toHaveBeenCalledTimes(1);
    push(); push(); push(); // 窗口内合并
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2); // 尾补发一次
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2); // 无更多
  });

  it('跨窗口的变更各自即时推送', () => {
    const fn = vi.fn();
    const push = createThrottledBroadcast(fn, 500);
    push();
    vi.advanceTimersByTime(600);
    push();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
