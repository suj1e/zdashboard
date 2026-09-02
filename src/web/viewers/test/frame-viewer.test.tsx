import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FrameViewer } from '../FrameViewer.js';

vi.mock('../../hooks/useSSE.js', () => ({
  useSSE: () => 'live',
  useSSEEvent: vi.fn(),
}));

vi.mock('../freshness.js', () => {
  let v = 0;
  return {
    useViewerFreshness: () => [v, () => { v += 1; }],
    RefreshButton: ({ onClick }: { onClick: () => void }) => (
      <button onClick={onClick} aria-label="刷新">刷新</button>
    ),
  };
});

describe('FrameViewer — pdf/html iframe 预览', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('iframe src 为编码后的文件路径', () => {
    render(<FrameViewer path="docs/manual/使用说明.html" />);
    const frame = screen.getByTitle('使用说明.html') as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe('/docs/manual/%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.html');
  });

  it('刷新按钮触发 v 参数失效重载', () => {
    const { rerender } = render(<FrameViewer path="report.pdf" />);
    expect((screen.getByTitle('report.pdf') as HTMLIFrameElement).src).not.toContain('v=');
    screen.getByRole('button', { name: '刷新' }).click();
    rerender(<FrameViewer path="report.pdf" />);
    expect((screen.getByTitle('report.pdf') as HTMLIFrameElement).src).toContain('v=');
  });
});
