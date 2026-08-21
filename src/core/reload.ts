import fs from 'node:fs';
import http from 'node:http';
import { Service } from 'cordis';
import type { Context } from 'cordis';

declare module 'cordis' {
  interface Context {
    reload: ReloadService;
  }
}

export class ReloadService extends Service {
  private clients = new Set<http.ServerResponse>();
  private watcher?: fs.FSWatcher;
  private timer?: NodeJS.Timeout;
  private root: string;

  constructor(ctx: Context, config: { root: string }) {
    super(ctx, 'reload');
    this.root = config.root;
    this.ctx.effect(() => this.dispose());

    this.ctx.server.sse('/__reload', (res) => {
      this.clients.add(res);
      return () => this.clients.delete(res);
    });

    try {
      this.watcher = fs.watch(this.root, { recursive: true }, () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.broadcast('reload');
          this.broadcast('files');
          console.log(`[zdashboard] change -> reload + refresh tree (${this.clients.size} client${this.clients.size === 1 ? '' : 's'})`);
        }, 150);
      });
    } catch {
      console.log('[zdashboard] watch unavailable - static only.');
    }
  }

  private broadcast(ev: string, data: unknown = '') {
    const payload = `event: ${ev}\ndata: ${JSON.stringify(data == null ? '' : data)}\n\n`;
    for (const c of this.clients) {
      try { c.write(payload); } catch {}
    }
  }

  dispose() {
    if (this.watcher) { try { this.watcher.close(); } catch {} }
    if (this.timer) { clearTimeout(this.timer); }
    for (const c of this.clients) { try { c.end(); } catch {} }
    this.clients.clear();
  }
}
