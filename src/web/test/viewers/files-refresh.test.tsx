/**
 * 数据新鲜度 T3:viewer 订阅 SSE files 事件(300ms 防抖)重取当前 path + 工具栏手动刷新按钮。
 *
 * 服务端 broadcast('files') 不带路径(payload 恒空串),viewer 挂载即只对应「当前资产」,
 * 重取自己当前 path 即「命中当前资产才失效」的落地形态;断线重连补偿同样派发空 payload,走同一订阅。
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MdViewer } from '../../viewers/MdViewer.js';
import { CodeViewer } from '../../viewers/CodeViewer.js';
import { ImageViewer } from '../../viewers/ImageViewer.js';
import { FakeES } from '../helpers/fake-es.js';

let fetchMock: Mock;

beforeEach(() => {
  (globalThis as Record<string, unknown>).EventSource = FakeES;
  fetchMock = vi.fn(async () =>
    ({ ok: true, status: 200, text: async () => '# hello' }) as unknown as Response
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as Record<string, unknown>).EventSource;
  vi.restoreAllMocks();
});

describe('MdViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件(300ms 防抖后)触发重取当前 path', async () => {
    render(<MdViewer path="docs/a.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/docs/a.md');
  });

  it('300ms 防抖窗口内多次 files 事件合并为一次重取', async () => {
    render(<MdViewer path="docs/b.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); es.emit('files', ''); es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    // 等过防抖窗口,确认合并后没有第三次请求
    await new Promise((r) => setTimeout(r, 450));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('工具栏刷新按钮手动重取当前 path', async () => {
    render(<MdViewer path="docs/c.md" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/docs/c.md');
  });

  it('首次加载失败才走 ErrorState,重试可恢复;frontmatter 正常解析', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error('first fail');
      return { ok: true, status: 200, text: async () => '---\ntitle: x\n---\n# 恢复内容' } as unknown as Response;
    });
    render(<MdViewer path="docs/err.md" />);
    expect(await screen.findByText(/加载失败|网络异常/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('恢复内容')).toBeInTheDocument();
    // frontmatter 分支:details 折叠块 + 正文剔除 frontmatter
    expect(screen.getByText('YAML frontmatter')).toBeInTheDocument();
  });

  it('重取失败保留旧内容,不闪错误页(stale-while-revalidate)', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, text: async () => '# 旧内容保持' } as unknown as Response;
      throw new Error('network down');
    });
    render(<MdViewer path="docs/stale.md" />);
    expect(await screen.findByText('旧内容保持')).toBeInTheDocument();
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    // 失败后旧内容仍在,不切 ErrorState
    expect(screen.getByText('旧内容保持')).toBeInTheDocument();
    expect(screen.queryByText(/加载失败|网络异常/)).not.toBeInTheDocument();
  });
});

describe('CodeViewer — files 订阅刷新(数据新鲜度 T3)', () => {
  it('files 事件触发重取 + 工具栏刷新按钮可用', async () => {
    render(<CodeViewer path="src/app.ts" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/__file-content/src/app.ts');

    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(String(fetchMock.mock.calls[2][0])).toContain('/__file-content/src/app.ts');
  });

  it('重取失败保留旧内容,不闪错误页;首次加载失败才走 ErrorState', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) return { ok: true, status: 200, text: async () => 'const kept = 1' } as unknown as Response;
      throw new Error('boom');
    });
    const { container } = render(<CodeViewer path="src/kept.ts" />);
    // hljs 高亮会把文本切碎,以 code 节点整体 textContent 断言
    const codeText = () => container.querySelector('code')?.textContent ?? '';
    await waitFor(() => expect(codeText()).toContain('const kept = 1'));
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(codeText()).toContain('const kept = 1');
    expect(screen.queryByText(/加载失败|网络异常/)).not.toBeInTheDocument();
  });

  it('复制按钮走剪贴板(工具栏回归)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<CodeViewer path="src/app.ts" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await waitFor(() => expect(screen.getByText('已复制')).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith('# hello');
  });
});

describe('ImageViewer — files 订阅刷新(审查 B1)', () => {
  it('files 事件后 img src 加失效版本号强制重载,刷新按钮可用', async () => {
    const { container } = render(<ImageViewer path="img/logo.svg" />);
    const img = () => container.querySelector('img')!;
    // view 语义根路径直取,初始 src 无版本参数
    expect(img().getAttribute('src')).toBe('/img/logo.svg');
    const es = FakeES.instances.at(-1)!;
    act(() => { es.emit('files', ''); });
    await waitFor(() => expect(img().getAttribute('src')).toContain('v='), { timeout: 3000 });
    // 同一 img 节点未重挂(仅 src 变更)
    expect(container.querySelector('img')).toBe(img());

    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(img().getAttribute('src')).toContain('v=2'));
  });
});

describe('MdViewer — 错误态重试过程反馈(审查 S2)', () => {
  it('错误态重试先进加载态给出过程反馈', async () => {
    let calls = 0;
    fetchMock.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error('first fail');
      // 第二次延迟返回,保证加载态窗口可断言
      return await new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, status: 200, text: async () => '# 反馈内容' } as unknown as Response), 80)
      );
    });
    render(<MdViewer path="docs/retry.md" />);
    expect(await screen.findByText(/加载失败|网络异常/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // 重取前清 err:呈现加载态而非停留在错误页
    expect(await screen.findByText('加载中…')).toBeInTheDocument();
    expect(await screen.findByText('反馈内容')).toBeInTheDocument();
    expect(screen.queryByText('加载中…')).not.toBeInTheDocument();
  });
});
