import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageHeader } from '../../kit/PageHeader.js';
import { Toolbar } from '../../kit/Toolbar.js';
import { SectionCard } from '../../kit/SectionCard.js';
import { EmptyState } from '../../kit/EmptyState.js';
import { ErrorState } from '../../kit/ErrorState.js';
import { Skeleton } from '../../kit/Skeleton.js';
import { Chip } from '../../kit/Chip.js';
import { IconButton } from '../../kit/IconButton.js';
import { DataList } from '../../kit/DataList.js';
import { KeyValue } from '../../kit/KeyValue.js';
import { AsyncBoundary } from '../../kit/AsyncBoundary.js';
import { PluginPage } from '../../kit/PluginPage.js';

const manifest = { mode: 'view', label: '项目浏览', icon: '' };

describe('AsyncBoundary 三态边界', () => {
  const children = <p data-testid="content">内容</p>;

  it('loading=true 渲染骨架屏且不渲染 children', () => {
    render(<AsyncBoundary loading error={null} empty={false}>{children}</AsyncBoundary>);
    expect(screen.queryByTestId('content')).toBeNull();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('error 优先于 loading,渲染错误信息与重试按钮', () => {
    const onRetry = vi.fn();
    render(<AsyncBoundary loading error="boom" empty={false} onRetry={onRetry}>{children}</AsyncBoundary>);
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /重试/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('无重试回调时不出现重试按钮', () => {
    render(<AsyncBoundary loading={false} error="x" empty>{children}</AsyncBoundary>);
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('empty=true 渲染空状态(不含 children)', () => {
    render(<AsyncBoundary loading={false} error={null} empty emptyTitle="暂无文件">{children}</AsyncBoundary>);
    expect(screen.getByText('暂无文件')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).toBeNull();
  });

  it('三态皆否渲染 children', () => {
    render(<AsyncBoundary loading={false} error={null} empty={false}>{children}</AsyncBoundary>);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

describe('关键组件快照与结构', () => {
  it('PageHeader 快照', () => {
    const { container } = render(
      <PageHeader title="项目浏览" breadcrumb={['插件']} actions={<button>刷新</button>} status={{ label: '就绪', tone: 'success' }} />
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('项目浏览');
  });

  it('面包屑分段:末段 flex-none font-medium 不截断;前段 truncate 且 title 为全路径', () => {
    render(
      <PageHeader
        title="T"
        breadcrumb={['插件', 'view', 'docs/specs/很长的路径段一段二段三段四段五']}
      />,
    );
    const last = screen.getByText('docs/specs/很长的路径段一段二段三段四段五');
    expect(last.className).toContain('font-medium');
    expect(last.className).toContain('flex-none');
    expect(last.className).not.toContain('truncate');
    // 前段:truncate 收窄,title 悬浮展示全路径
    const first = screen.getByText('插件');
    expect(first.className).toContain('truncate');
    expect(first).toHaveAttribute('title', '插件 / view / docs/specs/很长的路径段一段二段三段四段五');
    const middle = screen.getByText('view');
    expect(middle.className).toContain('truncate');
    expect(middle).toHaveAttribute('title', '插件 / view / docs/specs/很长的路径段一段二段三段四段五');
  });

  it('Toolbar 快照并透传子元素', () => {
    const { container } = render(
      <Toolbar><input placeholder="搜索" /><button>批量</button></Toolbar>
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByPlaceholderText('搜索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量' })).toBeInTheDocument();
  });

  it('EmptyState 快照', () => {
    const { container } = render(<EmptyState title="暂无数据" hint="稍后再试" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('稍后再试')).toBeInTheDocument();
  });

  it('ErrorState 展示消息并可触发重试', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="加载失败" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /重试/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('SectionCard 标题与 children 分区渲染', () => {
    render(<SectionCard title="分组"><span data-testid="sec">正文</span></SectionCard>);
    expect(screen.getByText('分组')).toBeInTheDocument();
    expect(screen.getByTestId('sec')).toBeInTheDocument();
  });

  it('Skeleton 可叠加多个默认骨架行', () => {
    const { container } = render(<Skeleton rows={3} />);
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });
});

describe('原子组件', () => {
  it.each(['default', 'success', 'warning', 'destructive', 'info'] as const)('Chip tone=%s 渲染语义色类', (tone) => {
    const { container } = render(<Chip tone={tone}>标签</Chip>);
    expect(container.firstChild).toHaveClass(tone === 'default' ? 'bg-muted' : `text-${tone}`);
  });

  it('IconButton 必须携带 aria-label,点击可回调', () => {
    const onClick = vi.fn();
    render(<IconButton label="刷新" onClick={onClick}><svg /></IconButton>);
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('DataList items 渲染 + 空列表回退 EmptyState', () => {
    render(<DataList items={['a', 'b']} renderItem={(item) => <span>{item}</span>} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();

    const { rerender } = render(<DataList items={[]} renderItem={(i: never) => i} />);
    rerender(<DataList items={[]} renderItem={() => null} emptyText="没有条目" />);
    expect(screen.getByText('没有条目')).toBeInTheDocument();
  });

  it('KeyValue 键值对渲染', () => {
    render(<KeyValue pairs={[{ k: '分支', v: 'main' }, { k: '脏文件', v: 3 }]} />);
    expect(screen.getByText('分支')).toBeInTheDocument();
    expect(screen.getByText(String('main'))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('PluginPage 模板', () => {
  it('渲染标题、动作与 toolbar,children 直接显示', () => {
    render(
      <PluginPage manifest={manifest} actions={<button>操作</button>} toolbar={<input placeholder="过滤" />}>
        <span data-testid="pg">页面体</span>
      </PluginPage>
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('项目浏览');
    expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('过滤')).toBeInTheDocument();
    expect(screen.getByTestId('pg')).toBeInTheDocument();
  });

  it('传入 state 时经 AsyncBoundary 托管 children 三态', () => {
    render(
      <PluginPage manifest={manifest} state={{ loading: true }}>
        <span data-testid="pg2">不应出现</span>
      </PluginPage>
    );
    expect(screen.queryByTestId('pg2')).toBeNull();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});
