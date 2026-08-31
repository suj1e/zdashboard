/**
 * localStorage 安全包装(ux-low-batch T1):
 * 隐私模式/配额满/storage 被禁时原生调用会抛异常——三函数均 try/catch 静默降级,
 * 持久化失败不影响功能正确性(仅失去记忆)。全仓 localStorage 直调点一律经此访问。
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* storage 不可用时静默 */ }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* storage 不可用时静默 */ }
}

/** StorageLike 形态(themeBoot.resolveThemeBoot 的入参契约),main.tsx 冷启动经此访问 */
export const safeStorage = { getItem: safeGetItem, setItem: safeSetItem, removeItem: safeRemoveItem };
