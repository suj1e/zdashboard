/**
 * ux-low-batch T4:复制失败反馈。
 * clipboard.writeText reject → toast.error(「复制失败」),不再只 console 静默。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { CodeViewer } from '../../viewers/CodeViewer.js';
import { MdViewer } from '../../viewers/MdViewer.js';

const MD_TEXT = '# 标题\n\n```js\nconst a = 1;\n```\n';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    return { ok: true, status: 200, text: async () => MD_TEXT } as unknown as Response;
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CodeViewer — 复制失败 toast', () => {
  it('clipboard 写入失败 → toast.error(复制失败)', async () => {
    const errSpy = vi.spyOn(toast, 'error').mockImplementation(() => '');
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<CodeViewer path="a.js" />);
    await screen.findByText('复制');
    fireEvent.click(screen.getByRole('button', { name: '复制' }));
    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('复制失败'));
    expect(screen.queryByText('已复制')).toBeNull(); // 失败不得误报成功
  });
});

describe('MdViewer CodeBlock — 复制失败 toast', () => {
  it('clipboard 写入失败 → toast.error(复制失败)', async () => {
    const errSpy = vi.spyOn(toast, 'error').mockImplementation(() => '');
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<MdViewer path="a.md" />);
    const copyBtn = await screen.findByRole('button', { name: '复制' });
    fireEvent.click(copyBtn);
    await waitFor(() => expect(errSpy).toHaveBeenCalledWith('复制失败'));
  });
});
