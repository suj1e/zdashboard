/**
 * T3 iframe 三态验收(ExternalWorkspace):
 * - 未握手 → Skeleton 覆盖层(不黑屏);
 * - zd:ready 握手 → 覆盖层消失,超时不触发;
 * - 8s 未握手 → timeout → ErrorState;点重试 → iframe 重挂(节点替换 = key++);
 * - 插件配置拉取失败 → 提示条。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExternalWorkspace } from '../../components/ExternalWorkspace.js';
import { FakeES } from '../helpers/fake-es.js';
import { __resetRouterForTest } from '../../router.js';

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

/** 以 iframe 的 contentWindow 为 source 派发桥消息(宿主按 source 严格配对) */
function dispatchFrom(iframe: HTMLIFrameElement, data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { source: iframe.contentWindow, data }));
}

function renderWs() {
  return render(<ExternalWorkspace viewerUrl="https://ext.example/view.html" label="外部插件" mode="ext" />);
}

beforeEach(() => {
  __resetRouterForTest();
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__plugins/config')) return okJson({ ext: { key: 'value' } });
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExternalWorkspace — 握手三态', () => {
  it('未握手 → 渲染 Skeleton 覆盖层(iframe 仍挂载)', () => {
    const { container } = renderWs();
    expect(container.querySelector('iframe')).not.toBeNull();
    expect(screen.getByTestId('handshake-overlay')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });

  it('zd:ready 握手 → 覆盖层消失;8s 内不再出现 ErrorState', () => {
    vi.useFakeTimers();
    const { container } = renderWs();
    const iframe = container.querySelector('iframe')!;
    act(() => { dispatchFrom(iframe, { source: 'zdashboard', type: 'zd:ready' }); });
    expect(screen.queryByTestId('handshake-overlay')).not.toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('8s 未握手 → ErrorState;点重试 → iframe 重挂(key++ 表现为节点替换)', () => {
    vi.useFakeTimers();
    const { container } = renderWs();
    const iframeBefore = container.querySelector('iframe')!;

    act(() => { vi.advanceTimersByTime(8_000); });
    expect(screen.getByRole('alert')).toHaveTextContent('超时');
    expect(screen.queryByTestId('handshake-overlay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // 重试后回到未握手覆盖层,iframe 节点被替换(key++ 重挂)
    const iframeAfter = container.querySelector('iframe')!;
    expect(iframeAfter).not.toBe(iframeBefore);
    expect(screen.getByTestId('handshake-overlay')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // 重挂后重新计时:再走 8s 且无握手 → 再次 timeout
    act(() => { vi.advanceTimersByTime(8_000); });
    expect(screen.getByRole('alert')).toHaveTextContent('超时');
  });
});

describe('ExternalWorkspace — 配置拉取失败提示条', () => {
  it('config 拉取失败 → 提示条出现;iframe 不受影响', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/__plugins/config')) throw new TypeError('network down');
      throw new Error(`unexpected fetch: ${url}`);
    }));
    const { container } = renderWs();
    expect(await screen.findByTestId('config-error-bar')).toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('config 拉取成功 → 无提示条', async () => {
    renderWs();
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('config-error-bar')).not.toBeInTheDocument();
  });
});
