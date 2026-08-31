/**
 * safeStorage 单测(ux-low-batch T1):
 * - 正常读写删:与 localStorage 语义一致(get 返回 null 当键不存在);
 * - 抛异常不崩:storage 不可用(隐私模式/配额满/被禁)时三函数均静默降级,不抛出。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../safeStorage.js';

const KEY = 'zd-test-key';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('safeStorage — 正常路径', () => {
  it('setItem 后 getItem 读回原值', () => {
    safeSetItem(KEY, 'hello');
    expect(safeGetItem(KEY)).toBe('hello');
  });

  it('getItem 键不存在 → null', () => {
    expect(safeGetItem('zd-nope')).toBeNull();
  });

  it('removeItem 后 getItem 回到 null', () => {
    safeSetItem(KEY, 'v');
    safeRemoveItem(KEY);
    expect(safeGetItem(KEY)).toBeNull();
  });

  it('removeItem 键不存在也不抛', () => {
    expect(() => safeRemoveItem('zd-nope')).not.toThrow();
  });
});

describe('safeStorage — storage 抛异常不崩', () => {
  it('setItem 抛异常 → 静默,不向上抛', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => safeSetItem(KEY, 'v')).not.toThrow();
  });

  it('getItem 抛异常 → 静默返回 null', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('AccessDenied');
    });
    expect(safeGetItem(KEY)).toBeNull();
  });

  it('removeItem 抛异常 → 静默,不向上抛', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('AccessDenied');
    });
    expect(() => safeRemoveItem(KEY)).not.toThrow();
  });

  it('抛异常后恢复可用:同一进程内后续读写正常', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => safeSetItem(KEY, 'v')).not.toThrow();
    spy.mockRestore();
    safeSetItem(KEY, 'v2');
    expect(safeGetItem(KEY)).toBe('v2');
  });
});
