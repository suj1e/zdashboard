/**
 * 冷启动主题解析(纯函数,无 DOM 依赖)。
 *
 * 逻辑单源:index.html head 的内联 FOUC 脚本是它的手写镜像(内联无法走 bundle,
 * 改动此处判定规则时必须同步内联脚本);main.tsx 启动时复用本函数做正式写入。
 */

import { STYLES } from './themes.js';

export const MODE_KEY = 'zd-mode';
export const THEME_KEY = 'zd-theme';
export const LEGACY_THEME_KEY = 'zdashboard-theme';

export interface ThemeBootResult {
  mode: 'dark' | 'light';
  theme: string;
  /** 是否发生了 legacy zdashboard-theme → zd-mode 迁移 */
  legacyMigrated: boolean;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const THEME_IDS = STYLES.map((s) => s.id);

function isValidMode(v: string | null): v is 'dark' | 'light' {
  return v === 'dark' || v === 'light';
}

/**
 * 从 storage 解析冷启动 mode/theme:
 * - zd-mode 缺失时迁移 legacy zdashboard-theme(light 之外一律 dark),并回写 zd-mode
 * - zd-mode 合法但 legacy 仍在 → 不动 legacy(保持现行为)
 * - 非法值兜底:mode → dark,theme → default(仅 dataset 层兜底,不篡改用户存储)
 */
export function resolveThemeBoot(storage: StorageLike): ThemeBootResult {
  let legacyMigrated = false;
  let raw = storage.getItem(MODE_KEY);
  if (!raw) {
    const legacy = storage.getItem(LEGACY_THEME_KEY);
    raw = legacy === 'light' ? 'light' : 'dark';
    storage.setItem(MODE_KEY, raw);
    storage.removeItem(LEGACY_THEME_KEY);
    legacyMigrated = legacy != null;
  }
  const mode: 'dark' | 'light' = isValidMode(raw) ? raw : 'dark';

  const theme = storage.getItem(THEME_KEY);
  return {
    mode,
    theme: theme != null && THEME_IDS.includes(theme) ? theme : 'default',
    legacyMigrated,
  };
}
