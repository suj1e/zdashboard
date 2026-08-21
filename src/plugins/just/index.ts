import type { Context } from 'cordis';
import { JustRunner } from '../../server/just-runner.js';

import type { Context } from 'cordis';
import http from 'node:http';
import { JustRunner } from '../../server/just-runner.js';

export function apply(ctx: Context) {
  const root = (ctx as any).root as string;
  const runner = new JustRunner(root);
  ctx.server.setRunner(runner);
  ctx.effect(() => runner.stop());

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

  ctx.server.route('/__just/start', async (req, res) => {
    if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
    const body = await readBody(req);
    let recipe: string | undefined;
    try { recipe = JSON.parse(body || '{}').recipe; } catch {}
    const target = recipe ?? runner.info().recipe;
    if (!target) { res.writeHead(400); res.end('{"error":"no recipe"}'); return; }
    const recipes = await runner.recipes();
    if (!recipes.some((r) => r.name === target)) { res.writeHead(403); res.end('{"error":"unknown recipe"}'); return; }
    runner.start(target);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(runner.info()));
  });

  ctx.server.route('/__just/stop', async (req, res) => {
    if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
    runner.stop();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(runner.info()));
  });

  ctx.server.route('/__just/restart', async (req, res) => {
    if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
    const body = await readBody(req);
    let recipe: string | undefined;
    try { recipe = JSON.parse(body || '{}').recipe; } catch {}
    const target = recipe ?? runner.info().recipe;
    if (!target) { res.writeHead(400); res.end('{"error":"no recipe"}'); return; }
    const recipes = await runner.recipes();
    if (!recipes.some((r) => r.name === target)) { res.writeHead(403); res.end('{"error":"unknown recipe"}'); return; }
    runner.restart(target);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(runner.info()));
  });

  async function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (c: string | Buffer) => { data += c; });
      req.on('end', () => resolve(data));
    });
  }
}
