/**
 * just server 侧:definePlugin 接入(manifest 单源)。
 *
 * JustRunner 并发核实结论(T5):src/server/just-runner.ts 已是多任务并发 runner ——
 * tasks Map 每 recipe 独立子进程/日志缓冲/状态,事件载荷自带 recipe(=taskId),
 * 无需 runner 池改造。plugin:just:log 等频道广播按事件原样携带 taskId。
 *
 * start/restart/stop/clear 走 guardedRoute(x-stop-token);
 * /__just/tasks 为活跃任务侧栏新增只读路由。
 */
import type http from 'node:http';
import { JustRunner } from '../../server/just-runner.js';
import { readBody } from '../../core/read-body.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';
import type { RouteHandler } from '../../sdk/server.js';

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    const runner = new JustRunner(root);
    ctx.onDispose(() => runner.stop());

    ctx.route('/__just/recipes', async () => {
      try {
        return await runner.recipes();
      } catch {
        return [];
      }
    });

    ctx.route('/__just/tasks', async () => runner.list());

    ctx.sse('/__just/logs', (res) => {
      const unsub = runner.subscribe((ev) => {
        // 插件频道镜像:type 即事件名(log/clear/state),载荷携带 taskId(recipe)
        try { ctx.broadcast(ev.type, ev); } catch { /* reload 未就绪 */ }
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
      });
      return unsub;
    });

    /** start/restart 须带合法 recipe(同名 start 即重启);stop 可带单个 recipe 或省略(停全部);clear 清日志 */
    const handleAction = async (req: http.IncomingMessage, res: http.ServerResponse, act: 'start' | 'stop' | 'restart' | 'clear') => {
      const body = await readBody(req);
      let recipe: string | undefined;
      try { recipe = JSON.parse(body || '{}').recipe; } catch { /* ignore */ }
      if (act === 'clear') {
        if (recipe) runner.clear(recipe);
        return { ok: true };
      }
      if (act !== 'stop') {
        if (!recipe) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('{"error":"no recipe"}');
          return undefined;
        }
        const recipes = await runner.recipes();
        if (!recipes.some((r) => r.name === recipe)) {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('{"error":"unknown recipe"}');
          return undefined;
        }
        runner.start(recipe);
      } else {
        runner.stop(recipe || undefined);
      }
      return runner.list();
    };

    const routeAction = (name: 'start' | 'stop' | 'restart' | 'clear') => {
      ctx.guardedRoute(`/__just/${name}`, ((req, res) => handleAction(req, res, name)) satisfies RouteHandler);
    };
    routeAction('start');
    routeAction('stop');
    routeAction('restart');
    routeAction('clear');
  },
});
