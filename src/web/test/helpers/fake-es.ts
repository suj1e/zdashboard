/**
 * jsdom 无 EventSource 的共享测试桩(SSE 相关测试通用)。
 * - 实例收集在 static instances,用例经 instances.at(-1) 取当前连接;
 * - open/error 由用例手工开火模拟原生重连;emit 手工派发具名事件
 *   (服务端 /__reload 的具名事件 payload 恒为 '' 或 JSON 字符串,此处不校验)。
 */
export class FakeES {
  static instances: FakeES[] = [];
  listeners = new Map<string, Set<(e: unknown) => void>>();
  closed = false;
  onopen?: () => void;
  onerror?: () => void;
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(name: string, fn: (e: unknown) => void) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name)!.add(fn);
  }
  removeEventListener(name: string, fn: (e: unknown) => void) { this.listeners.get(name)?.delete(fn); }
  close() { this.closed = true; }
  emit(name: string, data: unknown) { this.listeners.get(name)?.forEach((fn) => fn({ data })); }
}
