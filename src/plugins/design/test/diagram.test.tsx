/**
 * T3 design 接入验收(图表类):
 * - categorize('.excalidraw'/'.drawio')→ 'diagram'(置于 CODE 判断前,.xml 等不拦截);
 * - selectViewer('diagram')→ DiagramViewer,内容拉取走 /__design/asset 代理;
 * - 渲染 → 懒加载画布收到 initialData(excalidraw 模块 mock,真实渲染交 playwright);
 * - scanAssets 响应形状契约在 server.test.ts ASSET_KEYS 同步。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { categorize } from '../../../server/design-assets.js';
import { selectViewer, ASSET_VIEWER_TYPES } from '../viewers/index.js';
import { UnsupportedViewer, DiagramViewer as DiagramAssetViewer } from '../viewers/misc.js';
import { DiagramViewer as SharedDiagramViewer } from '../../../web/viewers/DiagramViewer.js';

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

beforeEach(() => {
  excalidrawProps.length = 0;
  vi.stubGlobal('fetch', vi.fn(async () => (
    { ok: true, status: 200, text: async () => SCENE } as unknown as Response
  )));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('design categorize — 图表扩展', () => {
  it('.excalidraw/.drawio → diagram', () => {
    expect(categorize('diagrams/arch.excalidraw', '.excalidraw')).toBe('diagram');
    expect(categorize('diagrams/flow.drawio', '.drawio')).toBe('diagram');
  });

  it('置于 CODE 判断前:token 命名/大写扩展名不影响归类', () => {
    expect(categorize('design/tokens.drawio', '.drawio')).toBe('diagram');
    expect(categorize('design/A.EXCALIDRAW', '.excalidraw')).toBe('diagram');
  });
});

describe('design selectViewer — diagram 注册', () => {
  it("ASSET_VIEWER_TYPES 契约含 'diagram'", () => {
    expect(ASSET_VIEWER_TYPES).toContain('diagram');
  });

  it("selectViewer('diagram') → design 代理包装的 DiagramViewer(非 Unsupported)", () => {
    expect(selectViewer('diagram')).toBe(DiagramAssetViewer);
    expect(selectViewer('diagram')).not.toBe(UnsupportedViewer);
    expect(selectViewer('diagram')).not.toBe(SharedDiagramViewer);
  });

  it('渲染 diagram 查看器 → 内容拉取走 /__design/asset 代理', async () => {
    const Viewer = selectViewer('diagram');
    render(<Viewer path="diagrams/arch.excalidraw" />);
    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/__design/asset?path=' + encodeURIComponent('diagrams/arch.excalidraw'));
    });
  });

  it('渲染 → 懒加载画布收到 initialData', async () => {
    const Viewer = selectViewer('diagram');
    render(<Viewer path="diagrams/arch.excalidraw" />);
    expect(await screen.findByTestId('excalidraw-mock')).toBeInTheDocument();
    expect(excalidrawProps[0].initialData).toEqual(JSON.parse(SCENE));
  });
});
