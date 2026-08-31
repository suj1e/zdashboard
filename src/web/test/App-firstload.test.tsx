/**
 * T1 深链接/首载骨架验收:
 * - usePlugins 首载(plugins 空)→ 全页 Skeleton,不渲染 HomeGrid(深链接无首页闪现);
 * - 深链接 ?p=xxx 在注册表就绪前同样落骨架,而非空 HomeGrid。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../lib/plugins.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/plugins.js')>();
  return { ...actual, usePlugins: () => [] };
});

import App from '../App.js';
import { TooltipProvider } from '../components/ui/tooltip.js';

/** jsdom 无 EventSource,壳层挂载会建 /__reload 连接,给个可 close 的空壳 */
class FakeES {
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) }) as unknown as Response));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('App — pluginsReady 首载骨架', () => {
  it('plugins 空(首载)→ 渲染全页骨架而非 HomeGrid', () => {
    window.history.replaceState(null, '', '/');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    // HomeGrid 未渲染:其探测行(「探测」chip 行)不应出现
    expect(screen.queryByText('探测')).not.toBeInTheDocument();
  });

  it('深链接 ?p=xxx 注册表未就绪 → 同样落骨架而非空首页', () => {
    window.history.replaceState(null, '', '/?p=design');
    render(
      <TooltipProvider>
        <App />
      </TooltipProvider>,
    );
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByText('探测')).not.toBeInTheDocument();
  });
});
