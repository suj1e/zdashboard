/**
 * T1 DiagramViewer 验收(design.md 测试策略 1):
 * - .excalidraw → lazy Excalidraw 收到 initialData(mock 模块,真实渲染交 playwright);
 * - .drawio → iframe src 含 `#R` + encodeURIComponent(xml);
 * - 损坏 JSON → 错误态;超大(>2MB)→ 错误态;
 * - resolve 代理生效(design 场景)/ 无 resolve 走 /__file-content(view 场景)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiagramViewer } from '../DiagramViewer.js';

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

const SCENE_FIXTURE = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  source: 'zdashboard',
  elements: [{ id: 'e1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50 }],
  appState: { viewBackgroundColor: '#ffffff' },
  files: {},
});

const DRAWIO_FIXTURE = '<mxfile><diagram id="p1" name="Page-1">中文 & <mxCell/></diagram></mxfile>';

function okText(t: string) {
  return { ok: true, status: 200, text: async () => t } as unknown as Response;
}

beforeEach(() => {
  excalidrawProps.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DiagramViewer — .excalidraw 路径', () => {
  it('fixture JSON → lazy Excalidraw 收到解析后的 initialData', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(SCENE_FIXTURE)));
    render(<DiagramViewer path="diagrams/arch.excalidraw" />);
    expect(await screen.findByTestId('excalidraw-mock')).toBeInTheDocument();
    expect(excalidrawProps.length).toBeGreaterThan(0);
    expect(excalidrawProps[0].initialData).toEqual(JSON.parse(SCENE_FIXTURE));
    expect(excalidrawProps[0].viewModeEnabled).toBe(true);
  });

  it('损坏 JSON → 错误态(不渲染 Excalidraw)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText('{ not-json')));
    render(<DiagramViewer path="diagrams/broken.excalidraw" />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('excalidraw-mock')).not.toBeInTheDocument();
  });

  it('超大(>2MB)→ 「文件过大」错误态', async () => {
    const big = 'x'.repeat(2 * 1024 * 1024 + 1);
    vi.stubGlobal('fetch', vi.fn(async () => okText(big)));
    render(<DiagramViewer path="diagrams/huge.excalidraw" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件过大');
  });

  it('fetch 404 → 「文件不存在」错误态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }) as unknown as Response));
    render(<DiagramViewer path="diagrams/missing.excalidraw" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件不存在');
  });
});

describe('DiagramViewer — .drawio 路径', () => {
  it('xml → iframe src 含 #R + encodeURIComponent(xml),并提供新窗口降级链接', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(DRAWIO_FIXTURE)));
    render(<DiagramViewer path="diagrams/flow.drawio" />);
    const iframe = await screen.findByTitle('flow.drawio');
    expect(iframe.getAttribute('src')).toBe('https://viewer.diagrams.net/?#R' + encodeURIComponent(DRAWIO_FIXTURE));
    const link = screen.getByRole('link', { name: '在新窗口打开 viewer' });
    expect(link.getAttribute('href')).toContain('https://viewer.diagrams.net/');
  });

  it('超大(>2MB)→ 「文件过大」错误态(不渲染 iframe)', async () => {
    const bigXml = '<!-- ' + 'x'.repeat(2 * 1024 * 1024 + 1) + ' -->';
    vi.stubGlobal('fetch', vi.fn(async () => okText(bigXml)));
    render(<DiagramViewer path="diagrams/huge.drawio" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件过大');
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
  });
});

describe('DiagramViewer — 内容拉取路由', () => {
  it('无 resolve(view 场景)→ fetch /__file-content/<path>', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(SCENE_FIXTURE)));
    render(<DiagramViewer path="diagrams/arch.excalidraw" />);
    await screen.findByTestId('excalidraw-mock');
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/__file-content/diagrams/arch.excalidraw');
  });

  it('传 resolve(design 场景)→ fetch 走代理 URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(SCENE_FIXTURE)));
    const viaProxy = (p: string) => '/__design/asset?path=' + encodeURIComponent(p);
    render(<DiagramViewer path="diagrams/arch.excalidraw" resolve={viaProxy} />);
    await screen.findByTestId('excalidraw-mock');
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(viaProxy('diagrams/arch.excalidraw'));
  });
});
