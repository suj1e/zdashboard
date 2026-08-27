/**
 * T7 顺延义务:hasJust 旗标探测兜底。
 * 新版 just 移除 `--list --unsupported` 旗标导致报错 → hasJust 恒 false。
 * 兜底:旗标探测失败时回退 `just --version` 探测二进制可用性。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ calls: [] as string[][] }));

vi.mock('node:child_process', async () => {
  const cp = {
    execFile: vi.fn((file: string, args: string[], _opts: unknown, cb?: (err: unknown) => void) => {
      h.calls.push([file, ...args]);
      // 新版 just:--unsupported 是未知旗标 → 报错;--version 正常
      if (args.includes('--unsupported')) cb?.(new Error('error: unexpected argument \'--unsupported\' found'));
      else cb?.(null);
      return { killed: false };
    }),
  };
  return { ...cp, default: cp };
});

import { detect } from '../detect.js';

beforeEach(() => {
  h.calls.length = 0;
});

describe('justAvailable — 旗标探测兜底', () => {
  it('just --list --unsupported 报错(新版 just)时回退 --version 判定 hasJust=true', async () => {
    const result = await detect('/tmp');
    expect(result.hasJust).toBe(true);
    // 确有旗标探测在前、兜底在后
    expect(h.calls[0]).toEqual(['just', '--list', '--unsupported']);
    expect(h.calls[1]).toEqual(['just', '--version']);
  });
});
