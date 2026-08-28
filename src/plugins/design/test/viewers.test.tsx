/**
 * T4 design 前端验收:九类资产查看器注册表 + TokenViewer 解析 + 预览区。
 * 资产加载一律走 /__design/asset?path= 代理(约定根 .zdev/design,直取根路径必 404)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { selectViewer, ASSET_VIEWER_TYPES } from '../viewers/index.js';
import { UnsupportedViewer, PdfViewer, VideoViewer, AudioViewer, FontViewer } from '../viewers/misc.js';
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

  it('page → iframe 预览,src 走代理路由', () => {
    const { container } = render(<PageViewer path=".zdev/design/home.html" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe('/__design/asset?path=' + encodeURI('.zdev/design/home.html'));
  });
});

describe('design viewer 资产 src 走 /__design/asset 代理', () => {
  it('pdf → iframe src 走代理路由', () => {
    const { container } = render(<PdfViewer path="docs/spec.pdf" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe('/__design/asset?path=' + encodeURI('docs/spec.pdf'));
  });

  it('video/audio → media src 走代理路由', () => {
    const { container: v } = render(<VideoViewer path="demo/demo.mp4" />);
    expect(v.querySelector('video')!.getAttribute('src')).toBe('/__design/asset?path=' + encodeURI('demo/demo.mp4'));
    const { container: a } = render(<AudioViewer path="demo/demo.mp3" />);
    expect(a.querySelector('audio')!.getAttribute('src')).toBe('/__design/asset?path=' + encodeURI('demo/demo.mp3'));
  });

  it('font/token 内容拉取走代理路由', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return { text: async () => '', blob: async () => new Blob() } as unknown as Response;
    }));
    render(<FontViewer path="fonts/app.woff2" />);
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));
    expect(calls).toContain('/__design/asset?path=' + encodeURI('fonts/app.woff2'));
    expect(calls).toContain('/__design/asset?path=' + encodeURI('tokens.css'));
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
