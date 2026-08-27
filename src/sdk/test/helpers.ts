import { vi } from 'vitest';
import http from 'node:http';

/** 捕获 ServerResponse 关键行为的桩:writeHead/end/headersSent */
export function createRes() {
  const res = {
    headersSent: false,
    statusCode: 0 as number,
    headers: undefined as Record<string, unknown> | undefined,
    body: '' as unknown,
    ended: false,
    writeHead(status: number, headers?: Record<string, unknown>) {
      this.headersSent = true;
      this.statusCode = status;
      this.headers = headers;
      return this;
    },
    end(body?: unknown) {
      this.ended = true;
      this.body = body ?? '';
    },
  };
  return res;
}

export type FakeRes = ReturnType<typeof createRes>;

/** definePlugin.apply 需要的最小 cordis 宿主环境桩 */
export function createFakeCtx(opts?: {
  stopToken?: string;
  storedConfig?: Record<string, unknown>;
}) {
  const routes = new Map<string, (req: http.IncomingMessage, res: http.ServerResponse) => void>();
  const sses = new Map<string, unknown>();
  const statics = new Map<string, string>();
  const registered: Array<Record<string, unknown>> = [];
  /** ctx.effect(() => cleanup) 收集到的清理函数 */
  const cleanups: Array<() => void> = [];
  const broadcasts: Array<{ event: string; data: unknown }> = [];

  const ctx = {
    dashboard: { register: vi.fn((m: Record<string, unknown>) => { registered.push(m); }) },
    server: {
      stopToken: opts?.stopToken ?? 'tok-123',
      route: vi.fn((path: string, handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) => { routes.set(path, handler); }),
      sse: vi.fn((path: string, handler: unknown) => { sses.set(path, handler); }),
      static: vi.fn((prefix: string, dir: string) => { statics.set(prefix, dir); }),
      getPluginConfig: vi.fn(() => opts?.storedConfig ?? {}),
    },
    reload: {
      broadcast: vi.fn((event: string, data?: unknown) => { broadcasts.push({ event, data }); }),
    },
    effect: vi.fn((fn: () => () => void) => { cleanups.push(fn()); }),
  };
  return { ctx, routes, sses, statics, registered, cleanups, broadcasts };
}
