/**
 * T4 动效 CSS 解析单测:从库 CSS 文本(minified)零依赖提取类名/类规则/keyframes/时序参数。
 * 供 MotionTab 源码查看与提示词 CSS 内嵌,纯函数无框架依赖。
 */
import { describe, it, expect } from 'vitest';
import {
  parseClassNames,
  extractClassRule,
  extractKeyframes,
  extractTiming,
  motionSourceOf,
} from '../motion-css.js';

const ANIMATE_SAMPLE = [
  '@media (print),(prefers-reduced-motion:reduce){.animate__animated.animate__bounce{animation-duration:1ms!important}}',
  '.animate__animated.animate__bounce{animation:bounce 1s infinite both}',
  '@keyframes bounce{0%{transform:translateY(0)}50%{transform:translateY(-25%)}}',
].join('\n');

const HOVER_SAMPLE = [
  '.hvr-float{display:inline-block;transition-duration:.3s;transition-property:transform}',
  '.hvr-float:hover,.hvr-float:focus,.hvr-float:active{transform:translateY(-4px)}',
].join('\n');

describe('parseClassNames — 提取类名', () => {
  it('提取全部类选择器名(含 animate__ 双下划线与 hvr- 连字符)', () => {
    const names = parseClassNames(ANIMATE_SAMPLE + '\n' + HOVER_SAMPLE);
    expect(names).toContain('animate__animated');
    expect(names).toContain('animate__bounce');
    expect(names).toContain('hvr-float');
  });

  it('忽略 @media/@keyframes 等非类 at 规则与伪类后缀', () => {
    const names = parseClassNames(HOVER_SAMPLE);
    expect(names).toEqual(['hvr-float']); // :hover/:focus/:active 不产生新类名,去重
  });

  it('空/非法输入返回空数组', () => {
    expect(parseClassNames('')).toEqual([]);
    expect(parseClassNames('not css {}')).toEqual([]);
  });
});

describe('extractClassRule — 提取类规则', () => {
  it('animate.css:跳过 reduced-motion !important 覆盖,取主规则', () => {
    const rule = extractClassRule(ANIMATE_SAMPLE, 'animate__bounce');
    expect(rule).toBe('.animate__animated.animate__bounce{animation:bounce 1s infinite both}');
  });

  it('hover.css:命中类规则', () => {
    expect(extractClassRule(HOVER_SAMPLE, 'hvr-float')).toBe(
      '.hvr-float{display:inline-block;transition-duration:.3s;transition-property:transform}',
    );
  });

  it('类名不存在 → null', () => {
    expect(extractClassRule(ANIMATE_SAMPLE, 'animate__missing')).toBeNull();
  });
});

describe('extractKeyframes — 括号配平提取', () => {
  it('嵌套花括号的 keyframes 完整截取', () => {
    const kf = extractKeyframes(ANIMATE_SAMPLE, 'bounce');
    expect(kf).toBe('@keyframes bounce{0%{transform:translateY(0)}50%{transform:translateY(-25%)}}');
  });

  it('不存在 → null', () => {
    expect(extractKeyframes(ANIMATE_SAMPLE, 'nope')).toBeNull();
  });
});

describe('extractTiming — 时序/缓动参数', () => {
  it('从 animation 简写解析时长与迭代次数', () => {
    const rule = extractClassRule(ANIMATE_SAMPLE, 'animate__bounce') ?? '';
    expect(extractTiming(rule)).toMatchObject({ duration: '1s', iteration: 'infinite' });
  });

  it('hover.css transition-duration 回退', () => {
    const rule = extractClassRule(HOVER_SAMPLE, 'hvr-float') ?? '';
    expect(extractTiming(rule).duration).toBe('.3s');
  });
});

describe('motionSourceOf — 规则 + keyframes 组合源码', () => {
  it('animate.css 类 = 类规则 + 引用的 keyframes', () => {
    const src = motionSourceOf(ANIMATE_SAMPLE, 'animate__bounce');
    expect(src).toContain('.animate__animated.animate__bounce{animation:bounce 1s infinite both}');
    expect(src).toContain('@keyframes bounce');
    expect(src.split('\n')).toHaveLength(2);
  });

  it('hover.css 类仅规则(无 keyframes)', () => {
    const src = motionSourceOf(HOVER_SAMPLE, 'hvr-float');
    expect(src).toContain('transition-duration:.3s');
    expect(src).not.toContain('@keyframes');
  });
});
