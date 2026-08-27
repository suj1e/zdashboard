/**
 * stop-token 统一获取:页面并不渲染 meta[name=stop-token],写操作鉴权所需的
 * token 需经 /__config 拉取(仿 LogViewer/StopButton 已验证模式)。
 * 服务端会话内 token 不变,故缓存复用;拉取失败不缓存,下次调用自动重试。
 */
let cached: Promise<string> | null = null;

export function getStopToken(): Promise<string> {
  cached ??= fetch('/__config', { cache: 'no-store' })
    .then((r) => r.json())
    .then((cfg: { stopToken?: string }) => cfg.stopToken ?? '')
    .catch(() => {
      cached = null;
      return '';
    });
  return cached;
}

/** 测试专用:清空 token 缓存,强制下个调用重新拉取 */
export function __resetStopTokenForTest(): void {
  cached = null;
}
