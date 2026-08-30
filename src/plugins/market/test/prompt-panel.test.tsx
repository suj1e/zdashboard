/**
 * T1 PromptPanel 组件验收:
 * - textarea 可编辑,复制 = 编辑后的 textarea 值(clipboard mock);
 * - 复制成功 toast(sonner mock),失败 fallback 选中全文 + 错误 toast;
 * - 复制成功写入最近记录,历史项点击回看复用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptPanel } from '../PromptPanel.js';

const { toastSuccess, toastError, writeText } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

beforeEach(() => {
  localStorage.clear();
  toastSuccess.mockClear();
  toastError.mockClear();
  writeText.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stubClipboard(mode: 'ok' | 'reject') {
  writeText.mockImplementation(async () => {
    if (mode === 'reject') throw new DOMException('denied', 'NotAllowedError');
  });
}

describe('PromptPanel — 编辑与复制', () => {
  it('渲染模板初始文本,可编辑', () => {
    render(<PromptPanel market="logos" initial="为 React 设计一个 Logo" />);
    const box = screen.getByLabelText('提示词') as HTMLTextAreaElement;
    expect(box.value).toBe('为 React 设计一个 Logo');
    fireEvent.change(box, { target: { value: '为 Vue 设计一个 Logo' } });
    expect(box.value).toBe('为 Vue 设计一个 Logo');
  });

  it('复制 = 编辑后的 textarea 值 + 成功 toast + 写入最近记录', async () => {
    stubClipboard('ok');
    render(<PromptPanel market="motions" initial="实现一个 弹跳 动效" />);
    const box = screen.getByLabelText('提示词') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: '实现一个 弹跳 动效(已加要求)' } });
    fireEvent.click(screen.getByRole('button', { name: '复制提示词' }));
    await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('已复制到剪贴板'));
    expect(writeText).toHaveBeenCalledWith('实现一个 弹跳 动效(已加要求)');
    const hist = JSON.parse(localStorage.getItem('zdashboard.market.promptHistory') ?? '[]');
    expect(hist).toHaveLength(1);
    expect(hist[0].text).toBe('实现一个 弹跳 动效(已加要求)');
  });

  it('剪贴板拒绝:fallback 选中文本提示手动复制 + 错误 toast', async () => {
    stubClipboard('reject');
    render(<PromptPanel market="inspirations" initial="设计一个类似 Excalidraw 的页面" />);
    const box = screen.getByLabelText('提示词') as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole('button', { name: '复制提示词' }));
    await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('手动复制')));
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe(box.value.length);
  });

  it('最近记录可回看:点击历史项载入 textarea', async () => {
    stubClipboard('ok');
    render(<PromptPanel market="logos" initial="初始模板" />);
    const box = screen.getByLabelText('提示词') as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: '历史样本提示词' } });
    fireEvent.click(screen.getByRole('button', { name: '复制提示词' }));
    await screen.findByText('历史样本提示词');
    fireEvent.change(box, { target: { value: '换成别的' } });
    fireEvent.click(screen.getByText('历史样本提示词'));
    expect((screen.getByLabelText('提示词') as HTMLTextAreaElement).value).toBe('历史样本提示词');
  });
});
