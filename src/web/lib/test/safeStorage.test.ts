/**
 * safeStorage 单测(ux-low-batch T1):
 * - 正常读写删:与 localStorage 语义一致(get 返回 null 当键不存在);
 * - 抛异常不崩:storage 不可用(隐私模式/配额满/被禁)时三函数均静默降级,不抛出。
 * review B1:readJsonSafe 单源 JSON 骨架——缺键/损坏/非法形状(validate 拒绝)一律回落 fallback。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeGetItem, safeSetItem, safeRemoveItem, readJsonSafe } from '../safeStorage.js';

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

describe('readJsonSafe — JSON 单源骨架(review B1)', () => {
  interface Shape { a: number }
  const isShape = (v: unknown): v is Shape =>
    !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as Shape).a === 'number';
  const FALLBACK: Shape = { a: 0 };

  it('缺键 → fallback', () => {
    expect(readJsonSafe('zd-nope', FALLBACK, isShape)).toEqual(FALLBACK);
  });

  it('合法 JSON + 无 validate → 返回解析值', () => {
    safeSetItem(KEY, '{"a":1}');
    expect(readJsonSafe<Shape>(KEY, FALLBACK)).toEqual({ a: 1 });
  });

  it('合法 JSON + validate 通过 → 返回解析值', () => {
    safeSetItem(KEY, '{"a":2}');
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual({ a: 2 });
  });

  it('损坏 JSON → fallback(不抛)', () => {
    safeSetItem(KEY, '{ not json');
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual(FALLBACK);
  });

  it('validate 拒绝(非法形状)→ fallback,缺省/损坏/非法回落哲学一致', () => {
    safeSetItem(KEY, '{"a":"not-a-number"}');
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual(FALLBACK);
    safeSetItem(KEY, '[1,2]');
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual(FALLBACK);
    safeSetItem(KEY, 'null');
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual(FALLBACK);
  });

  it('存储读取抛异常 → fallback(不抛)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('AccessDenied');
    });
    expect(readJsonSafe(KEY, FALLBACK, isShape)).toEqual(FALLBACK);
  });

  it('fallback 为引用类型时返回的是 fallback 本身(调用方自带新对象)', () => {
    expect(readJsonSafe('zd-nope', FALLBACK, isShape)).toBe(FALLBACK);
  });
});
