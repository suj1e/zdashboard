import type { Context } from 'cordis';
import { scanAssets } from '../../server/design-assets.js';

export function apply(ctx: Context) {
  ctx.server.route('/__design/assets', async (_req, res) => {
    const root = (ctx as any).root as string;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(scanAssets(root)));
  });
}
