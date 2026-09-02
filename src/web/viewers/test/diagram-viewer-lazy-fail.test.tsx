/**
 * Review S4:excalidraw lazy chunk 加载失败 → 局部 ErrorBoundary 降级(viewer 级错误态 + 重试),
 * 不得冒泡成全局崩溃。独立文件:vi.mock 工厂返回 rejected promise 模拟 chunk 加载失败
 * (vitest 工厂结果被缓存,失败场景须与成功路径隔离,见 diagram-viewer.test.tsx)。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagramViewer } from '../DiagramViewer.js';

vi.mock('@excalidraw/excalidraw', () => Promise.reject(new Error('Failed to fetch dynamically imported module')));

const SCENE_FIXTURE = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  source: 'zdashboard',
  elements: [],
  appState: {},
  files: {},
});

function okText(t: string) {
  return { ok: true, status: 200, text: async () => t } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DiagramViewer — lazy chunk 加载失败(S4)', () => {
  it('import reject → 局部错误态 + 重试,不冒泡全局', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(SCENE_FIXTURE)));
    // Boundary 缺失时 lazy reject 会在 render 期间抛出,render() 直接失败——本用例能跑完即证明已局部化
    render(<DiagramViewer path="diagrams/arch.excalidraw" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('渲染器加载失败');
    // 局部降级:viewer 自己的工具栏(外层 RefreshButton)仍在,而非整树卸载
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
    expect(screen.queryByTestId('excalidraw-mock')).not.toBeInTheDocument();
  });

  it('重试仍失败 → 错误态保持(不白屏不崩溃)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okText(SCENE_FIXTURE)));
    render(<DiagramViewer path="diagrams/arch.excalidraw" />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    // 新一轮 lazy 依旧 reject → Boundary 再次兜底
    expect(await screen.findByRole('alert')).toHaveTextContent('渲染器加载失败');
  });
});
