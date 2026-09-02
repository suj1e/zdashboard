/**
 * T4 design 前端验收:九类资产查看器注册表 + TokenViewer 解析 + 预览区。
 * 资产加载一律走 /__design/asset?path= 代理(约定根 .zdev/design,直取根路径必 404)。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { selectViewer, ASSET_VIEWER_TYPES } from '../viewers/index.js';
import { UnsupportedViewer, PdfViewer, VideoViewer, AudioViewer, FontViewer, MdViewer, ImageViewer, CodeViewer } from '../viewers/misc.js';
import TokenViewer from '../viewers/TokenViewer.js';
import PageViewer from '../viewers/PageViewer.js';

/** 代理 URL 构造与生产同式:查询值必须 encodeURIComponent(&、+、#、= 不被截断) */
const viaProxy = (p: string) => '/__design/asset?path=' + encodeURIComponent(p);

const CSS_FIXTURE = `:root {
  --color-primary: #ff0000;
  --color-bg: rgb(0, 0, 0);
  --font-body: "Inter", sans-serif;
  --space-1: 4px;
}`;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    // fetchText 门卫消费端:mock 必须模拟真实 Response 的 ok/status
    return { ok: true, status: 200, text: async () => (url.includes('tokens.css') ? CSS_FIXTURE : '') } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('design 查看器注册表 — 资产查看器全量渲染', () => {
  it('全部资产类型均有对应查看器(十类:九类 + diagram)', () => {
    expect(ASSET_VIEWER_TYPES).toEqual(['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font', 'diagram']);
    for (const t of ASSET_VIEWER_TYPES) {
      expect(selectViewer(t), t).not.toBe(UnsupportedViewer);
    }
  });

  it('未知类型回落 UnsupportedViewer', () => {
    expect(selectViewer('nope')).toBe(UnsupportedViewer);
  });

  it('page → iframe 预览,src 走代理路由', () => {
    const { container } = render(<PageViewer path="home.html" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe(viaProxy('home.html'));
  });
});

describe('design viewer 资产 src 走 /__design/asset 代理', () => {
  it('pdf → iframe src 走代理路由', () => {
    const { container } = render(<PdfViewer path="docs/spec.pdf" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe(viaProxy('docs/spec.pdf'));
  });

  it('video/audio → media src 走代理路由', () => {
    const { container: v } = render(<VideoViewer path="demo/demo.mp4" />);
    expect(v.querySelector('video')!.getAttribute('src')).toBe(viaProxy('demo/demo.mp4'));
    const { container: a } = render(<AudioViewer path="demo/demo.mp3" />);
    expect(a.querySelector('audio')!.getAttribute('src')).toBe(viaProxy('demo/demo.mp3'));
  });

  it('font/token 内容拉取走代理路由', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return { ok: true, status: 200, text: async () => '', blob: async () => new Blob() } as unknown as Response;
    }));
    render(<FontViewer path="fonts/app.woff2" />);
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));
    expect(calls).toContain(viaProxy('fonts/app.woff2'));
    expect(calls).toContain(viaProxy('tokens.css'));
  });
});

describe('design 共享查看器经 resolve 走代理(icon/md/component,B1)', () => {
  it('icon → ImageViewer img src 走代理', () => {
    const { container } = render(<ImageViewer path="icons/logo.svg" />);
    expect(container.querySelector('img')!.getAttribute('src')).toBe(viaProxy('icons/logo.svg'));
  });

  it('md → MdViewer 内容拉取走代理', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return { ok: true, status: 200, text: async () => '# hi' } as unknown as Response;
    }));
    render(<MdViewer path="docs/readme.md" />);
    await waitFor(() => expect(calls).toContain(viaProxy('docs/readme.md')));
  });

  it('component → CodeViewer 内容拉取走代理', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return { ok: true, text: async () => 'const x = 1' } as unknown as Response;
    }));
    render(<CodeViewer path="comp/button.tsx" />);
    await waitFor(() => expect(calls).toContain(viaProxy('comp/button.tsx')));
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => 'body { margin: 0 }' }) as unknown as Response));
    render(<TokenViewer path="plain.css" />);
    expect(await screen.findByText('未发现 CSS 变量')).toBeInTheDocument();
  });
});
