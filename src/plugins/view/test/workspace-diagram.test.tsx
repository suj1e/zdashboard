/**
 * T2 view 接入验收:.excalidraw/.drawio 深链接 → viewerFor 命中 DiagramViewer
 * (经真实 Workspace 路由分发;.excalidraw mock 懒加载模块,.drawio 断言官方 viewer iframe)。
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import Workspace from '../Workspace.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';
import { __resetRouterForTest } from '../../../web/router.js';

const { excalidrawProps } = vi.hoisted(() => ({ excalidrawProps: [] as Record<string, unknown>[] }));

vi.mock('@excalidraw/excalidraw', async () => {
  const { createElement } = await import('react');
  return {
    Excalidraw: (props: Record<string, unknown>) => {
      excalidrawProps.push(props);
      return createElement('div', { 'data-testid': 'excalidraw-mock' });
    },
  };
});

const SCENE = JSON.stringify({ type: 'excalidraw', version: 2, elements: [], appState: {}, files: {} });
const XML = '<mxfile><diagram name="Page-1"/></mxfile>';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

/** jsdom 无 IntersectionObserver(OutlineNav 滚动追踪用) */
class FakeIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});
afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  __resetPluginDataForTest();
  __resetRouterForTest();
  excalidrawProps.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__file-content')) {
      const text = url.endsWith('.excalidraw') ? SCENE : XML;
      return { ok: true, status: 200, text: async () => text } as unknown as Response;
    }
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('view viewerFor — 图表扩展命中 DiagramViewer', () => {
  it('.excalidraw 深链接 → DiagramViewer 渲染只读画布(initialData 已传)', async () => {
    setLocation('/?p=view&file=diagrams%2Farch.excalidraw');
    render(<Workspace params={new URLSearchParams('?p=view&file=diagrams%2Farch.excalidraw')} />);
    expect(await screen.findByTestId('excalidraw-mock')).toBeInTheDocument();
    expect(excalidrawProps[0].initialData).toEqual(JSON.parse(SCENE));
    expect(screen.queryByText('该格式无法预览')).not.toBeInTheDocument();
  });

  it('.drawio 深链接 → DiagramViewer 渲染 diagrams.net viewer iframe', async () => {
    setLocation('/?p=view&file=diagrams%2Fflow.drawio');
    render(<Workspace params={new URLSearchParams('?p=view&file=diagrams%2Fflow.drawio')} />);
    const iframe = await screen.findByTitle('flow.drawio', {}, { timeout: 3000 });
    expect(iframe.getAttribute('src')).toContain('https://viewer.diagrams.net/?#R');
    expect(iframe.getAttribute('src')).toContain(encodeURIComponent(XML));
    expect(screen.queryByText('该格式无法预览')).not.toBeInTheDocument();
  });
});
