/**
 * localStorage 安全包装(ux-low-batch T1):
 * 隐私模式/配额满/storage 被禁时原生调用会抛异常——三函数均 try/catch 静默降级,
 * 持久化失败不影响功能正确性(仅失去记忆)。新增持久化键一律经此访问
 * (既有 OutlineNav/SidebarFrame 六处自带 try/catch 直调保留)。
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

/**
 * JSON 值安全读取单源骨架(review B1):缺键 / 损坏 JSON / 形状校验不过 / 存储不可用
 * 一律回落 fallback(统一回落哲学,杜绝三份手写骨架的语义漂移)。
 * fallback 为引用类型时调用方传字面量/新对象,勿共享可变引用。
 */
export function readJsonSafe<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T {
  try {
    const raw = safeGetItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}
