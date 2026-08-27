/**
 * 插件 SDK(server 侧):definePlugin 是插件接入宿主的唯一姿势。
 *
 * 内部自动完成 dashboard.register(manifest) 与 effect 清理注册,
 * 插件作者只面对 PluginContext 的七个通道;四种 cordis 手写姿势由此消亡。
 */
import type http from 'node:http';
import { json, guarded } from '../core/server.js';
import type { Context } from 'cordis';
import type { PluginManifest } from '../core/manifest.js';

/** handler 返回非 undefined 值时由 SDK 包装为 json 响应;自行写响应则返回 undefined */
export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => unknown | Promise<unknown>;

export type SseHandler = (res: http.ServerResponse) => (() => void) | void;

export interface PluginContext {
  /** manifest.mode 的只读镜像 */
  readonly mode: string;
  /** manifest.config 默认值合并 .zdev/dashboard.json 存储值(存储优先) */
  config<T extends Record<string, unknown> = Record<string, unknown>>(): T;
  /** 注册路由;handler 返回值自动 json 包装(200 + application/json) */
  route(path: string, handler: RouteHandler): void;
  /** 校验 x-stop-token 后执行 route 语义;缺/错 token 直接 403 */
  guardedRoute(path: string, handler: RouteHandler): void;
  sse(path: string, handler: SseHandler): void;
  static(prefix: string, dir: string): void;
  /** 广播到 SSE 频道 plugin:<mode>:<event>,客户端 usePluginData subscribe 消费 */
  broadcast(event: string, data?: unknown): void;
  onDispose(fn: () => void): void;
}

interface CordisPluginApply {
  inject?: readonly string[];
  apply(ctx: Context, config: unknown): unknown;
}

/**
 * 定义内置/外部插件的 server 侧入口。
 * @param def.manifest  与 client defineWebPlugin 共享的同一份常量(SSOT)
 * @param def.setup     在 server/dashboard 服务就绪的上下文中执行
 */
export function definePlugin(def: {
  manifest: PluginManifest;
  setup(ctx: PluginContext): void;
}): CordisPluginApply & { inject: readonly string[] } {
  const { manifest, setup } = def;

  return {
    inject: ['server', 'dashboard', 'reload'] as const,
    apply(this: void, ctx: Context) {
      const disposers: Array<() => void> = [];
      ctx.effect(() => () => {
        for (const fn of disposers.splice(0)) {
          try { fn(); } catch (e) {
            console.error(`[zdashboard] plugin ${manifest.mode} dispose error:`, e);
          }
        }
      });

      ctx.dashboard.register(manifest);

      /** json 包装语义与错误兜底;guardedRoute 不经此重注册路径 */
      const respondWith = (handler: RouteHandler) => async (req: http.IncomingMessage, res: http.ServerResponse) => {
        if (res.headersSent) return;
        try {
          const data = await handler(req, res);
          if (data !== undefined && !res.writableEnded) json(res, data);
        } catch (e) {
          console.error(`[zdashboard] plugin ${manifest.mode} route error:`, e);
          if (!res.headersSent) json(res, { error: 'internal' }, 500);
        }
      };

      const pctx: PluginContext = {
        mode: manifest.mode,
        config<T extends Record<string, unknown> = Record<string, unknown>>(): T {
          const schema = manifest.config ?? {};
          const stored = ctx.server.getPluginConfig(manifest.mode) ?? {};
          const defaults = Object.fromEntries(
            Object.entries(schema).map(([key, field]) => [key, field.default]),
          );
          return { ...defaults, ...stored } as T;
        },
        route(path: string, handler: RouteHandler): void {
          ctx.server.route(path, respondWith(handler));
        },
        guardedRoute(path: string, handler: RouteHandler): void {
          const token = () => ctx.server.stopToken;
          ctx.server.route(path, (req, res) => {
            if (!guarded(req, res, token())) return;
            void respondWith(handler)(req, res);
          });
        },
        sse(path: string, handler: SseHandler): void {
          ctx.server.sse(path, handler);
        },
        static(prefix: string, dir: string): void {
          ctx.server.static(prefix, dir);
        },
        broadcast(event: string, data?: unknown): void {
          ctx.reload?.broadcast(`plugin:${manifest.mode}:${event}`, data ?? '');
        },
        onDispose(fn: () => void): void {
          disposers.push(fn);
        },
      };

      setup(pctx);
    },
  };
}
