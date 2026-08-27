import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../../components/ThemeToggle';

/** 初始化 jsdom 根元素 mode(main.tsx 启动时写入 dataset,此处模拟同一前置态) */
function setInitialMode(mode: 'dark' | 'light') {
  document.documentElement.dataset.mode = mode;
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    setInitialMode('dark');
  });

  it('single click flips mode, persists to localStorage and swaps icon', () => {
    const { container } = render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: '切换明暗' });

    expect(document.documentElement.dataset.mode).toBe('dark');
    expect(container.querySelector('svg.lucide-sun')).toBeTruthy();

    fireEvent.click(btn);

    expect(document.documentElement.dataset.mode).toBe('light');
    expect(localStorage.getItem('zd-mode')).toBe('light');
    // 图标随 state 翻转(light 显 sun … 当前实现 dark 显 sun,翻转后仍应稳定存在对应图标)
    expect(container.querySelector('svg.lucide-moon')).toBeTruthy();
    expect(container.querySelector('svg.lucide-sun')).toBeFalsy();
  });

  it('initial icon follows dataset mode (light → moon)', () => {
    setInitialMode('light');
    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('svg.lucide-moon')).toBeTruthy();
    expect(container.querySelector('svg.lucide-sun')).toBeFalsy();
  });

  it('rapid triple click cycles dark→light→dark→light consistently', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: '切换明暗' });

    // 记录每次点击后的 dataset 序列:修复前陈旧闭包会在首次后卡住(light,light,light)
    const sequence: (string | undefined)[] = [];
    for (let i = 0; i < 3; i++) {
      fireEvent.click(btn);
      sequence.push(document.documentElement.dataset.mode);
    }

    expect(sequence).toEqual(['light', 'dark', 'light']);
    expect(localStorage.getItem('zd-mode')).toBe('light');
  });

  it('aria-label and title stay stable across rapid clicks', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: '切换明暗' });

    for (let i = 0; i < 3; i++) {
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-label')).toBe('切换明暗');
      expect(btn.getAttribute('title')).toBe('切换明暗');
    }
  });
});
