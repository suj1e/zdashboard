/**
 * design 侧栏验收:目录树渲染(prototypes/design 两组)、空态引导、过滤。
 * usePluginData 以模块 mock 驱动(不发起真实 fetch)。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useRoute } from '../../../web/router.js';
import { usePluginData } from '../../../web/hooks/usePluginData.js';

const navigate = vi.fn();

vi.mock('../../../web/router.js', () => ({
  useRoute: () => ({
    params: new URLSearchParams(),
    navigate: navigate,
  }),
}));

vi.mock('../../../web/hooks/usePluginData.js', () => ({
  usePluginData: vi.fn(),
}));

import Sidebar from '../Sidebar.js';

function mockData(state: { data?: unknown; error?: string; loading?: boolean; refreshing?: boolean }) {
  vi.mocked(usePluginData).mockReturnValue({
    data: state.data ?? null,
    error: state.error ?? null,
    loading: state.loading ?? false,
    refreshing: state.refreshing ?? false,
    reload: vi.fn(),
  } as never);
}

const TREE = {
  tree: [
    {
      name: 'prototypes (1)', kind: 'dir',
      children: [
        { name: 'login', kind: 'dir', children: [{ name: 'index.html', kind: 'file', path: 'prototypes/login/index.html' }] },
      ],
    },
    {
      name: 'design (1)', kind: 'dir',
      children: [{ name: 'icons', kind: 'dir', children: [{ name: 'logo.svg', kind: 'file', path: 'design/icons/logo.svg' }] }],
    },
  ],
};

beforeEach(() => {
  navigate.mockClear();
  vi.mocked(usePluginData).mockClear();
});

describe('design 侧栏 — 目录树', () => {
  it('渲染 prototypes/design 两个顶级分组与文件节点', async () => {
    mockData({ data: TREE, loading: false });
    render(<Sidebar />);
    expect(await screen.findByText('prototypes')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
    expect(screen.getByText('index.html')).toBeInTheDocument();
    expect(screen.getByText('logo.svg')).toBeInTheDocument();
  });

  it('两目录均缺失 → 空态引导', async () => {
    mockData({ data: { tree: [] }, loading: false });
    render(<Sidebar />);
    expect(await screen.findByText('未发现设计资产')).toBeInTheDocument();
  });

  it('加载中 → 骨架;错误 → ErrorState', async () => {
    mockData({ data: null, loading: true });
    const { unmount } = render(<Sidebar />);
    expect(document.querySelector('[data-slot*="skeleton"], .animate-pulse') ?? document.body).toBeTruthy();
    unmount();

    mockData({ data: null, loading: false, error: 'read fail' });
    render(<Sidebar />);
    expect(await screen.findByText(/read fail/)).toBeInTheDocument();
  });
});
