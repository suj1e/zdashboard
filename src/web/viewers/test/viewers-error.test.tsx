/**
 * T3 viewer 错误态验收:
 * - MdViewer/CodeViewer/TokenViewer 走 fetchText 门卫;
 *   404 →「文件不存在」,其余错误 → 「加载失败…」类文案(两者分开,不再 404 渲染空白/乱码);
 * - 重试按钮触发重新 fetch;
 * - ImageViewer onError → 「图片加载失败」(勘正旧「该格式无法预览」文案)+ 重试重挂 src。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MdViewer } from '../MdViewer.js';
import { CodeViewer } from '../CodeViewer.js';
import { ImageViewer } from '../ImageViewer.js';
import TokenViewer from '../../../plugins/design/viewers/TokenViewer.js';

function setLocation(url: string) {
  window.history.replaceState(null, '', url);
}

function okText(t: string) {
  return { ok: true, status: 200, text: async () => t } as unknown as Response;
}
function httpError(status: number, body: unknown) {
  return { ok: false, status, text: async () => JSON.stringify(body), json: async () => body } as unknown as Response;
}

beforeEach(() => {
  setLocation('/?p=view');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setLocation('/');
});

describe('MdViewer — fetchText 门卫错误态', () => {
  it('404 → 「文件不存在」文案(不再渲染空白/乱码)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(404, '')));
    render(<MdViewer path="docs/missing.md" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件不存在');
  });

  it('500 → 「加载失败」类文案,与 404 文案分开', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(500, { error: 'read fail' })));
    render(<MdViewer path="docs/x.md" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('read fail');
    expect(screen.queryByText('文件不存在')).not.toBeInTheDocument();
  });

  it('点重试 → 触发重新 fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(404, '')));
    render(<MdViewer path="docs/missing.md" />);
    await screen.findByRole('alert');
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await vi.waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('2xx → 正常渲染 markdown 内容', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText('# hello')));
    render(<MdViewer path="docs/x.md" />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('hello');
  });
});

describe('CodeViewer — fetchText 门卫错误态', () => {
  it('404 → 「文件不存在」文案(替代旧「HTTP 404」裸文案)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(404, '')));
    render(<CodeViewer path="comp/missing.tsx" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件不存在');
  });

  it('500 → 加载失败文案 + 重试重新 fetch', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(async () => (fail ? httpError(500, { error: 'boom' }) : okText('const x = 1'))));
    render(<CodeViewer path="comp/button.tsx" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // 高亮后代码被 hljs 拆进 span,断言 code 节点聚合文本
    await vi.waitFor(() => {
      expect(document.querySelector('code')?.textContent).toContain('const x = 1');
    });
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('TokenViewer — fetchText 门卫错误态', () => {
  it('404 → 「文件不存在」文案', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(404, '')));
    render(<TokenViewer path=".zdev/design/tokens.css" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('文件不存在');
  });

  it('500 → 加载失败文案(ErrorState),不再静默渲染「未发现 CSS 变量」', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(500, { error: 'asset read fail' })));
    render(<TokenViewer path="tokens.css" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('asset read fail');
    expect(screen.queryByText('未发现 CSS 变量')).not.toBeInTheDocument();
  });

  it('点重试 → 触发重新 fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => httpError(404, '')));
    render(<TokenViewer path="tokens.css" />);
    await screen.findByRole('alert');
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await vi.waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});

describe('ImageViewer — onError 文案勘正 + 重试', () => {
  function fireImgError() {
    const img = document.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
  }

  it('加载失败 → 「图片加载失败」文案(不再误报「该格式无法预览」)', async () => {
    render(<ImageViewer path="icons/logo.svg" />);
    fireImgError();
    expect(await screen.findByRole('alert')).toHaveTextContent('图片加载失败');
    expect(screen.queryByText('该格式无法预览')).not.toBeInTheDocument();
  });

  it('点重试 → 清错误态,src 重挂(img 重新渲染,URL 不变)', async () => {
    render(<ImageViewer path="icons/logo.svg" />);
    const srcBefore = document.querySelector('img')!.getAttribute('src');
    fireImgError();
    fireEvent.click(await screen.findByRole('button', { name: '重试' }));
    const img = await screen.findByRole('img');
    expect(img.getAttribute('src')).toBe(srcBefore);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
