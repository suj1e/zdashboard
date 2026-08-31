/**
 * 数据新鲜度 T3(design 侧):design 查看器同规则订阅 SSE files(300ms 防抖),
 * 命中当前资产才失效——viewer 挂载即只对应当前资产,重取/失效版本号强制重载只作用于自身。
 * iframe 强制重载仅加失效版本号参数,不做全量 key 重挂。
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import TokenViewer from '../viewers/TokenViewer.js';
import PageViewer from '../viewers/PageViewer.js';
import { FontViewer, VideoViewer, AudioViewer, PdfViewer } from '../viewers/misc.js';
import { FakeES } from '../../../web/test/helpers/fake-es.js';

let fetchMock: Mock;

beforeEach(() => {
  (globalThis as Record<string, unknown>).EventSource = FakeES;
  // 含至少一个 CSS 变量:TokenViewer 空变量会提前走「未发现 CSS 变量」早退,渲染不出刷新按钮
  fetchMock = vi.fn(async () =>
    ({ ok: true, status: 200, text: async () => ':root { --color-primary: #ff0000; }', blob: async () => new Blob() }) as unknown as Response
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).EventSource;
  vi.restoreAllMocks();
});

describe('TokenViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件(300ms 防抖后)触发重取,多次事件合并为一次', async () => {
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 450));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__design/asset?path=tokens.css');
  });

  it('刷新按钮手动重取当前资产', async () => {
    render(<TokenViewer path="tokens.css" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('重取失败保留旧分区,不闪错误页', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, text: async () => ':root { --kept: #000000; }' } as unknown as Response;
      throw new Error('boom');
    });
    render(<TokenViewer path="tokens.css" />);
    expect(await screen.findByText('--kept')).toBeInTheDocument();
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(screen.getByText('--kept')).toBeInTheDocument();
    expect(screen.queryByText(/加载失败|网络异常/)).not.toBeInTheDocument();
  });
});

describe('PageViewer — files 命中当前资产 iframe 失效版本号强制重载(数据新鲜度 T3)', () => {
  it('初始 src 不带版本参数;files 事件后加失效版本号参数(不做 key 重挂)', async () => {
    const { container } = render(<PageViewer path="home.html" />);
    const iframe = () => container.querySelector('iframe')!;
    expect(iframe().getAttribute('src')).toBe('/__design/asset?path=' + encodeURIComponent('home.html'));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(iframe().getAttribute('src')).toContain('&v='), { timeout: 3000 });
    // 同一 iframe 节点未被重挂(仅 src 变更)
    expect(container.querySelector('iframe')).toBe(iframe());
  });

  it('刷新按钮同样触发失效版本号强制重载', async () => {
    const { container } = render(<PageViewer path="home.html" />);
    await waitFor(() => expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(container.querySelector('iframe')!.getAttribute('src')).toContain('&v='));
  });
});

describe('FontViewer — files 订阅重取字体资产(数据新鲜度 T3)', () => {
  it('files 事件触发 blob 重取', async () => {
    render(<FontViewer path="fonts/app.woff2" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__design/asset?path=');
  });
});

describe('media/pdf — files 命中当前资产 src 加失效版本号(数据新鲜度 T3)', () => {
  it('初始 src 干净;files 事件后 video/audio/iframe 均加 &v= 强制重载', async () => {
    const v = render(<VideoViewer path="demo/a.mp4" />);
    const a = render(<AudioViewer path="demo/a.mp3" />);
    const p = render(<PdfViewer path="docs/b.pdf" />);
    expect(v.container.querySelector('video')!.getAttribute('src')).not.toContain('&v=');
    expect(a.container.querySelector('audio')!.getAttribute('src')).not.toContain('&v=');
    expect(p.container.querySelector('iframe')!.getAttribute('src')).not.toContain('&v=');

    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(v.container.querySelector('video')!.getAttribute('src')).toContain('&v='), { timeout: 3000 });
    expect(a.container.querySelector('audio')!.getAttribute('src')).toContain('&v=');
    expect(p.container.querySelector('iframe')!.getAttribute('src')).toContain('&v=');
  });
});
