/**
 * ux-low-batch T4:LogViewer 日志容器 a11y(role=log + aria-live=polite + tabIndex 键盘可达)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LogViewer } from '../../../web/components/LogViewer.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

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

beforeEach(() => {
  localStorage.clear();
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LogViewer — 日志容器 a11y', () => {
  it('日志滚动容器:role=log + aria-live=polite + tabIndex=0(键盘可达)', async () => {
    render(<LogViewer />);
    const es = FakeES.instances.at(-1)!;
    act(() => { es.onopen?.(); });
    act(() => { es.onmessage?.({ data: JSON.stringify({ type: 'state', recipe: 'dev-server', state: 'running', code: null, startedAt: Date.now() }) }); });

    // 进入单任务视图(自动聚焦首个 running 任务)
    const scroller = await screen.findByTestId('log-scroll');
    expect(scroller).toHaveAttribute('role', 'log');
    expect(scroller).toHaveAttribute('aria-live', 'polite');
    expect(scroller).toHaveAttribute('tabindex', '0');
    expect(scroller).toHaveAttribute('aria-label');
  });
});
