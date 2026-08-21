import type { Context } from 'cordis';

export interface PluginManifest {
  mode: string;
  label: string;
  icon: string;
  description?: string;
  external?: boolean;
}

export const apply = {
  inject: ['server'] as const,
  apply(ctx: Context) {
    const plugins = new Map<string, PluginManifest>();
    ctx.effect(() => () => plugins.clear());

    ctx.inject(['server'], () => {
      const server = (ctx as any).server;
      if (!server?.route) return;

      server.route('/__plugins', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify({ plugins: Array.from(plugins.values()) }));
      });
    });

    return {
      register(manifest: PluginManifest) {
        plugins.set(manifest.mode, manifest);
      },
      list() {
        return Array.from(plugins.values());
      },
    };
  },
};
