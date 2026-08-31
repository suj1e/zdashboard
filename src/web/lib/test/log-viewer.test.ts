/**
 * just-log-ux T1 纯函数单测:滚动锚定判定 / 回底未读计数 / 日志级别识别 / 搜索高亮切分。
 * 纯函数,无 DOM 依赖;锚定阈值默认 40px(距底 <40px 视为在底部)。
 */
import { describe, it, expect } from 'vitest';
import {
  AT_BOTTOM_THRESHOLD_PX,
  isAtBottom,
  newLinesCount,
  levelOf,
  levelClass,
  splitHighlight,
} from '../log-viewer.js';

describe('isAtBottom — 滚动锚定判定(距底 <40px 才自动跟随)', () => {
  it('默认阈值 40', () => {
    expect(AT_BOTTOM_THRESHOLD_PX).toBe(40);
  });

  it('正好在底部(scrollHeight - scrollTop - clientHeight = 0)→ true', () => {
    expect(isAtBottom(1000, 800, 200)).toBe(true);
  });

  it('距底 39px → true(< 40 才跟随)', () => {
    expect(isAtBottom(1000, 761, 200)).toBe(true);
  });

  it('距底 40px → false(边界不含)', () => {
    expect(isAtBottom(1000, 760, 200)).toBe(false);
  });

  it('距底远 → false', () => {
    expect(isAtBottom(1000, 0, 200)).toBe(false);
  });

  it('自定义阈值生效', () => {
    expect(isAtBottom(1000, 750, 200, 100)).toBe(true); // 距底 50 < 100
    expect(isAtBottom(1000, 700, 200, 100)).toBe(false); // 距底 100 不含
  });
});

describe('newLinesCount — 回底按钮未读行数计数(负值归零)', () => {
  it('新增行数 = 总数 - 已见数', () => {
    expect(newLinesCount(1010, 1000)).toBe(10);
  });

  it('窗口滑动截断后总数可能变小 → 不出负数', () => {
    expect(newLinesCount(1000, 1005)).toBe(0);
  });

  it('无新增 → 0', () => {
    expect(newLinesCount(500, 500)).toBe(0);
  });
});

describe('levelOf — 日志级别识别(与 levelClass 着色同一识别源)', () => {
  it.each([
    ['[ERROR] boom', 'error'],
    ['[FATAL] boom', 'error'],
    ['ERROR Something failed', 'error'],
    ['[WARN] careful', 'warn'],
    ['[WARNING] careful', 'warn'],
    ['WARN deprecated', 'warn'],
    ['[DEBUG] detail', 'info'],
    ['DEBUG detail', 'info'],
    ['[INFO] fine', 'success'],
    ['[DOWNLOAD] 40%', 'success'],
    ['[PROGRESS] 1/2', 'success'],
    ['INFO starting', 'success'],
    ['plain output', 'plain'],
    ['just some text', 'plain'],
  ] as const)('%s → %s', (text, level) => {
    expect(levelOf(text)).toBe(level);
  });

  it('级别词必须出现在行首,行中不算', () => {
    expect(levelOf('some ERROR inside')).toBe('plain');
  });
});

describe('levelClass — 着色类名(级别 pill 过滤复用同一识别)', () => {
  it('error → text-destructive;warn → text-warning;info → text-info;success → text-success;plain → text-terminal-fg', () => {
    expect(levelClass('[ERROR] x')).toBe('text-destructive');
    expect(levelClass('[WARN] x')).toBe('text-warning');
    expect(levelClass('[DEBUG] x')).toBe('text-info');
    expect(levelClass('[INFO] x')).toBe('text-success');
    expect(levelClass('plain')).toBe('text-terminal-fg');
  });
});

describe('splitHighlight — 搜索命中切分(大小写不敏感;空 query 不切)', () => {
  it('命中一段 → [前缀未命中, 命中, 后缀未命中]', () => {
    expect(splitHighlight('hello world', 'wor')).toEqual([
      { text: 'hello ', hit: false },
      { text: 'wor', hit: true },
      { text: 'ld', hit: false },
    ]);
  });

  it('多次命中全部切出', () => {
    expect(splitHighlight('ab-cd-ab', 'ab')).toEqual([
      { text: 'ab', hit: true },
      { text: '-cd-', hit: false },
      { text: 'ab', hit: true },
    ]);
  });

  it('大小写不敏感,命中片段保留原文大小写', () => {
    expect(splitHighlight('Error: EPIPE', 'error')).toEqual([
      { text: 'Error', hit: true },
      { text: ': EPIPE', hit: false },
    ]);
  });

  it('无命中 → null(调用方直接渲染原文,不走 mark 分支)', () => {
    expect(splitHighlight('hello', 'xyz')).toBeNull();
  });

  it('空 query → null', () => {
    expect(splitHighlight('hello', '')).toBeNull();
  });
});
