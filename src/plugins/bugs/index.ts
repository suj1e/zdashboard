import type { Context } from 'cordis';
import { fetchBugs } from '../../server/bugs.js';

export function apply(ctx: Context) {
  ctx.server.route('/__bugs', async (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    const root = (ctx as any).root as string;
    try {
      const result = await fetchBugs(root);
      res.end(JSON.stringify(result));
    } catch (e) {
      res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : 'unknown error' }));
    }
  });
}
