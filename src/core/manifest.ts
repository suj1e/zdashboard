import { Service } from 'cordis';
import type { Context } from 'cordis';

declare module 'cordis' {
  interface Context {
    dashboard: DashboardService;
  }
}

export interface PluginManifest {
  mode: string;
  label: string;
  icon: string;
  description?: string;
  external?: boolean;
}

export class DashboardService extends Service {
  static inject = ['server'];
  private plugins = new Map<string, PluginManifest>();

  constructor(ctx: Context) {
    super(ctx, 'dashboard');
    this.ctx.effect(() => () => this.plugins.clear());

    this.ctx.server.route('/__plugins', (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ plugins: Array.from(this.plugins.values()) }));
    });
  }

  register(manifest: PluginManifest) {
    this.plugins.set(manifest.mode, manifest);
    this.ctx.effect(() => () => this.plugins.delete(manifest.mode));
  }

  list() {
    return Array.from(this.plugins.values());
  }
}
