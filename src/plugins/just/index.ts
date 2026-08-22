import type { Context } from 'cordis';
import http from 'node:http';
import { JustRunner } from '../../server/just-runner.js';
import { readBody } from '../../core/read-body.js';

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      const runner = new JustRunner(root);
      ctx.effect(() => () => runner.stop());

      ctx.dashboard.register({ mode: 'just', label: 'Just Runner', icon: '📜', description: 'Just 多任务并发执行与日志' });

      ctx.server.route('/__just/recipes', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        try {
          const recipes = await runner.recipes();
          res.end(JSON.stringify(recipes));
        } catch {
          res.end(JSON.stringify([]));
        }
      });

      ctx.server.sse('/__just/logs', (res) => {
        const unsub = runner.subscribe((ev) => {
          res.write(`data: ${JSON.stringify(ev)}\n\n`);
        });
        return unsub;
      });

      /** start/restart 须带合法 recipe(同名 start 即重启,不影响其他任务);stop 可带单个 recipe 或省略(停全部) */
      const handleAction = async (req: http.IncomingMessage, res: http.ServerResponse, act: 'start' | 'stop' | 'restart' | 'clear') => {
        if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
        const body = await readBody(req);
        let recipe: string | undefined;
        try { recipe = JSON.parse(body || '{}').recipe; } catch { /* ignore */ }
        if (act === 'clear') {
          if (recipe) runner.clear(recipe);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('{"ok":true}');
          return;
        }
        if (act !== 'stop') {
          if (!recipe) { res.writeHead(400); res.end('{"error":"no recipe"}'); return; }
          const recipes = await runner.recipes();
          if (!recipes.some((r) => r.name === recipe)) { res.writeHead(403); res.end('{"error":"unknown recipe"}'); return; }
          runner.start(recipe);
        } else {
          runner.stop(recipe || undefined);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(runner.list()));
      };

      const routeAction = (name: 'start' | 'stop' | 'restart' | 'clear') => {
        ctx.server.route(`/__just/${name}`, (req, res) => {
          handleAction(req, res, name).catch(() => {
            if (!res.headersSent) { res.writeHead(500); res.end('{"error":"internal"}'); }
          });
        });
      };
      routeAction('start');
      routeAction('stop');
      routeAction('restart');
      routeAction('clear');
    });
  },
};

