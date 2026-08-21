import fs from 'node:fs';
import http from 'node:http';
import type { Context } from 'cordis';

declare module 'cordis' {
  interface Context {
    reload: ReloadService;
  }
}

export class ReloadService {
  private clients = new Set<http.ServerResponse>();
  private watcher?: fs.FSWatcher;
  private timer?: NodeJS.Timeout;
  private root: string;

  constructor(ctx: Context, root: string) {
    this.root = root;
  }

  setServer(server: { sse: (path: string, onConnect: (res: http.ServerResponse) => (() => void) | void) => void }) {
    server.sse('/__reload', (res) => {
      this.clients.add(res);
      return () => this.clients.delete(res);
    });
    this.startWatch();
  }

  private startWatch() {
    try {
      this.watcher = fs.watch(this.root, { recursive: true }, () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.broadcast('reload');
          this.broadcast('files');
        }, 150);
      });
    } catch {
      // ignore - static environment without fs.watch support
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

export const apply = {
  inject: ['server'] as const,
  apply(ctx: Context, config: { root: string }) {
    const service = new ReloadService(ctx, config.root);
    const server = (ctx as any).server;
    if (server && typeof server.sse === 'function') {
      service.setServer(server);
    }
  }
};
