/**
 * T4 design 前端验收:九类资产查看器注册表 + TokenViewer 解析 + 预览区。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { selectViewer, ASSET_VIEWER_TYPES } from '../viewers/index.js';
import { UnsupportedViewer } from '../viewers/misc.js';
import TokenViewer from '../viewers/TokenViewer.js';
import PageViewer from '../viewers/PageViewer.js';

const CSS_FIXTURE = `:root {
  --color-primary: #ff0000;
  --color-bg: rgb(0, 0, 0);
  --font-body: "Inter", sans-serif;
  --space-1: 4px;
}`;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return { text: async () => (url.includes('tokens.css') ? CSS_FIXTURE : '') } as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('design 查看器注册表 — 九类资产渲染', () => {
  it('九类资产全部有对应查看器', () => {
    expect(ASSET_VIEWER_TYPES).toEqual(['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font']);
    for (const t of ASSET_VIEWER_TYPES) {
      expect(selectViewer(t), t).not.toBe(UnsupportedViewer);
    }
  });

  it('未知类型回落 UnsupportedViewer', () => {
    expect(selectViewer('nope')).toBe(UnsupportedViewer);
  });

  it('page → iframe 预览', () => {
    const { container } = render(<PageViewer path=".zdev/design/home.html" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe('/.zdev/design/home.html');
  });
});

describe('TokenViewer — CSS 变量解析分区', () => {
  it('解析配色/字体/其他三区', async () => {
    render(<TokenViewer path=".zdev/design/tokens.css" />);
    expect(await screen.findByText('配色 · 2')).toBeInTheDocument();
    expect(screen.getByText('字体 · 1')).toBeInTheDocument();
    expect(screen.getByText('其他 · 1')).toBeInTheDocument();
    expect(screen.getByText('--color-primary')).toBeInTheDocument();
    expect(screen.getByText('--font-body')).toBeInTheDocument();
  });

  it('无 CSS 变量的文件显示提示', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ text: async () => 'body { margin: 0 }' }) as Response));
    render(<TokenViewer path="plain.css" />);
    expect(await screen.findByText('未发现 CSS 变量')).toBeInTheDocument();
  });
});
