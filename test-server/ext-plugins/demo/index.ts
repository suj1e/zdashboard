import type { Context } from 'cordis';

export default {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    ctx.inject(['server', 'dashboard'], () => {
      const server = (ctx as any).server;
      const dashboard = (ctx as any).dashboard;
      if (!server?.route || !dashboard?.register) return;

      server.route('/__demo/api', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify({ ok: true }));
      });

      dashboard.register({
        mode: 'demo',
        label: '演示插件',
        icon: '🧩',
        description: '外部 viewer 演示',
      });
    });
  },
};
