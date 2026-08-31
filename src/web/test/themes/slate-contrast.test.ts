/**
 * T5 slate 主题对比度核验(取色核验的自动化):
 * light 模式 primary 作为 primary-foreground 文字的底色,WCAG AA 正文要求 ≥ 4.5:1。
 * 历史:blue-500(217 91% 60%)+ 白 ≈ 3.7:1 不达标 → 本测试钉住修复后的取值。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/web/themes/slate.css'), 'utf8');

/** 取 [data-theme="slate"](light)块内的 CSS 变量值(HSL 三元组字符串) */
function lightVar(name: string): string {
  const start = css.indexOf('[data-theme="slate"] {');
  const end = css.indexOf('[data-theme="slate"][data-mode="dark"]');
  expect(start, 'slate light 块应存在').toBeGreaterThan(-1);
  expect(end, 'slate dark 块应存在').toBeGreaterThan(-1);
  const block = css.slice(start, end);
  const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(m, `${name} 应存在于 slate light 块`).toBeTruthy();
  return m![1]!.trim();
}

function parseHsl(s: string): [number, number, number] {
  const [h, sa, l] = s.split(/\s+/).map((x) => Number(x.replace('%', '')));
  return [h!, sa!, l!];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const S = s / 100, L = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n: number) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function luminance(rgb: [number, number, number]): number {
  const lin = rgb.map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

function contrast(a: string, b: string): number {
  const la = luminance(hslToRgb(parseHsl(a)));
  const lb = luminance(hslToRgb(parseHsl(b)));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('slate light — primary 对比度(WCAG AA ≥ 4.5:1)', () => {
  it('primary 底 × primary-foreground 文字 ≥ 4.5:1(blue-600 替换 blue-500 后达标)', () => {
    const primary = lightVar('--primary');
    const fg = lightVar('--primary-foreground');
    expect(contrast(primary, fg)).toBeGreaterThanOrEqual(4.5);
  });

  it('ring 与 primary 保持同源(焦点环与主色一致)', () => {
    expect(lightVar('--ring')).toBe(lightVar('--primary'));
  });
});
