/**
 * ux-low-batch T4:IconButton 热区 ≥24px(WCAG 2.5.8)。
 * 视觉尺寸保持 var(--chip-h)=19px 不变,经 ::after 伪元素负 inset 扩出热区(19+6=25px);
 * 类名断言:after:content-[''] + after:absolute + after:-inset-[3px] 必须在基类上。
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconButton } from '../../kit/IconButton.js';

describe('IconButton — 热区扩大(伪元素)', () => {
  it('基类含 ::after 热区扩展开拓(≥24px 等效)', () => {
    const { container } = render(<IconButton label="示例" onClick={() => {}}>x</IconButton>);
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain("after:content-['']");
    expect(btn.className).toContain('after:absolute');
    expect(btn.className).toContain('after:-inset-[3px]'); // 19px + 3px*2 = 25px ≥ 24px
  });

  it('视觉尺寸 token 不变(h/min-w = --chip-h 19px)', () => {
    const { container } = render(<IconButton label="示例">x</IconButton>);
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('h-[var(--chip-h)]');
    expect(btn.className).toContain('min-w-[var(--chip-h)]');
  });
});
