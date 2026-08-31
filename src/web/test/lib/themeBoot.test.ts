import { describe, it, expect } from 'vitest';
import { resolveThemeBoot, MODE_KEY, THEME_KEY, LEGACY_THEME_KEY } from '../../lib/themeBoot.js';

/** Map 兜底的 Storage 替身,记录 setItem/removeItem 调用供断言 */
function fakeStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  const removed: string[] = [];
  return {
    storage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => { m.delete(k); removed.push(k); },
    },
    has: (k: string) => m.has(k),
    get: (k: string) => m.get(k),
    removed,
  };
}

describe('resolveThemeBoot(冷启动主题纯函数)', () => {
  it('全新环境:无任何 key → dark/default,回写 zd-mode,无 legacy 迁移', () => {
    const f = fakeStorage();
    const r = resolveThemeBoot(f.storage);
    expect(r).toEqual({ mode: 'dark', theme: 'default', legacyMigrated: false });
    expect(f.get(MODE_KEY)).toBe('dark');
    expect(f.has(LEGACY_THEME_KEY)).toBe(false);
  });

  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('zd-mode=%s 合法值直通', (input, expected) => {
    const f = fakeStorage({ [MODE_KEY]: input, [THEME_KEY]: 'pixel' });
    expect(resolveThemeBoot(f.storage).mode).toBe(expected);
  });

  it(`zd-mode 非法值(如 purple)兜底 dark,且不回写覆盖非法原值`, () => {
    const f = fakeStorage({ [MODE_KEY]: 'purple' });
    const r = resolveThemeBoot(f.storage);
    expect(r.mode).toBe('dark');
    expect(f.get(MODE_KEY)).toBe('purple'); // 仅 dataset 兜底,不篡改用户存储
  });

  it.each(['default', 'pixel', 'slate'] as const)('zd-theme=%s 合法值直通', (theme) => {
    const f = fakeStorage({ [MODE_KEY]: 'dark', [THEME_KEY]: theme });
    expect(resolveThemeBoot(f.storage).theme).toBe(theme);
  });

  it('zd-theme 缺失 → default;非法值(nord/banana/空串)→ default', () => {
    expect(resolveThemeBoot(fakeStorage({ [MODE_KEY]: 'dark' }).storage).theme).toBe('default');
    expect(resolveThemeBoot(fakeStorage({ [MODE_KEY]: 'dark', [THEME_KEY]: 'nord' }).storage).theme).toBe('default');
    expect(resolveThemeBoot(fakeStorage({ [MODE_KEY]: 'dark', [THEME_KEY]: '' }).storage).theme).toBe('default');
  });

  describe('legacy zdashboard-theme 迁移(仅 zd-mode 缺失时)', () => {
    it('legacy=light → light + 迁移标记 + legacy key 被移除 + zd-mode 回写', () => {
      const f = fakeStorage({ [LEGACY_THEME_KEY]: 'light' });
      const r = resolveThemeBoot(f.storage);
      expect(r).toEqual({ mode: 'light', theme: 'default', legacyMigrated: true });
      expect(f.get(MODE_KEY)).toBe('light');
      expect(f.has(LEGACY_THEME_KEY)).toBe(false);
      expect(f.removed).toEqual([LEGACY_THEME_KEY]);
    });

    it('legacy=dark → dark + 迁移标记', () => {
      const f = fakeStorage({ [LEGACY_THEME_KEY]: 'dark' });
      expect(resolveThemeBoot(f.storage)).toEqual({ mode: 'dark', theme: 'default', legacyMigrated: true });
    });

    it('legacy=非法值 → dark 兜底 + 仍完成迁移', () => {
      const f = fakeStorage({ [LEGACY_THEME_KEY]: 'banana' });
      expect(resolveThemeBoot(f.storage).mode).toBe('dark');
      expect(f.has(LEGACY_THEME_KEY)).toBe(false);
    });

    it('zd-mode 已存在时 legacy 不迁移、不移除(保持现行为)', () => {
      const f = fakeStorage({ [MODE_KEY]: 'light', [LEGACY_THEME_KEY]: 'dark' });
      const r = resolveThemeBoot(f.storage);
      expect(r).toEqual({ mode: 'light', theme: 'default', legacyMigrated: false });
      expect(f.has(LEGACY_THEME_KEY)).toBe(true);
      expect(f.removed).toEqual([]);
    });
  });

  it('组合:legacy light + zd-theme=slate → light/slate/migrated', () => {
    const f = fakeStorage({ [LEGACY_THEME_KEY]: 'light', [THEME_KEY]: 'slate' });
    expect(resolveThemeBoot(f.storage)).toEqual({ mode: 'light', theme: 'slate', legacyMigrated: true });
  });
});
