import { Service } from 'cordis';
import type { Context } from 'cordis';
import { readBody } from './read-body.js';

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
  viewerUrl?: string;      // 同源 URL，前端 iframe 渲染
  external?: boolean;
  config?: Record<string, ConfigField>;
}

export interface ConfigField {
  type: 'string' | 'text' | 'number' | 'boolean' | 'string[]' | 'select' | 'multiselect';
  label: string;
  default?: unknown;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export class DashboardService extends Service {
  static inject = ['server', 'reload'];
  private plugins = new Map<string, PluginManifest>();
  private reloadRef: any;

  constructor(ctx: Context) {
    super(ctx, 'dashboard');
    this.ctx.effect(() => () => this.plugins.clear());
    this.reloadRef = ctx.reload;

    this.ctx.server.route('/__plugins', (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ plugins: Array.from(this.plugins.values()) }));
    });

    this.ctx.server.route('/__plugins/config', async (req, res) => {
      const out: Record<string, Record<string, unknown>> = {};
      if (req.method === 'GET') {
        for (const m of this.plugins.values()) {
          const stored = this.ctx.server.getPluginConfig(m.mode);
          const schema = m.config ?? {};
          const merged: Record<string, unknown> = {};
          for (const [key, field] of Object.entries(schema)) {
            merged[key] = key in stored ? stored[key] : (field as ConfigField).default ?? '';
          }
          if (Object.keys(merged).length) out[m.mode] = merged;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(out));
        return;
      }
      if (req.method === 'POST') {
        if (req.headers['x-stop-token'] !== this.ctx.server.stopToken) {
          res.writeHead(403);
          res.end('forbidden');
          return;
        }
        try {
          const body = JSON.parse(await readBody(req));
          const merged = {};
          for (const mode of Object.keys(body)) {
            merged[mode] = body[mode] ?? {};
          }
          this.ctx.server.savePluginConfig(merged);
          for (const mode of Object.keys(body)) {
            try { this.reloadRef.broadcast('config', { plugin: mode }); } catch { /* ignore */ }
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end('{"ok":true}');
        } catch (e) {
          console.error('[config] POST error', e);
          res.writeHead(400);
          res.end('{"error":"bad request"}');
        }
        return;
      }
      res.writeHead(405);
      res.end('{"error":"method not allowed"}');
    });
  }

  register(manifest: PluginManifest) {
    this.plugins.set(manifest.mode, manifest);
    this.ctx.effect(() => () => this.plugins.delete(manifest.mode));
  }

  list() {
    return Array.from(this.plugins.values());
  }

  get(mode: string): PluginManifest | undefined {
    return this.plugins.get(mode);
  }

  getConfig(mode: string): Record<string, unknown> {
    return this.ctx.server.getPluginConfig(mode);
  }
}
