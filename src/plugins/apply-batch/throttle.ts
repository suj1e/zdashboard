/**
 * 节流广播:窗口内首调立即执行(leading),后续调用合并;窗口结束补发尾次(trailing)。
 * 用于 apply-batch store 变更 → plugin:apply-batch:state 频道,避免高频变更造成消息风暴。
 */
export function createThrottledBroadcast(fn: () => void, windowMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;
  return () => {
    if (timer) {
      pending = true;
      return;
    }
    fn();
    timer = setTimeout(() => {
      timer = null;
      if (pending) {
        pending = false;
        fn();
      }
    }, windowMs);
  };
}
