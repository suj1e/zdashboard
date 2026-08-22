import fs from 'node:fs';
import http from 'node:http';
import { Service } from 'cordis';
import type { Context } from 'cordis';

declare module 'cordis' {
  interface Context {
    reload: ReloadService;
  }
}

const WATCH_DEBOUNCE_MS = 150;

export class ReloadService extends Service {
  static inject = ['server'];
  private clients = new Set<http.ServerResponse>();
  private watcher?: fs.FSWatcher;
  private timer?: NodeJS.Timeout;

  constructor(ctx: Context, config: { root: string }) {
    super(ctx, 'reload');
    this.ctx.effect(() => () => this.dispose());

    this.ctx.server.sse('/__reload', (res) => {
      this.clients.add(res);
      return () => this.clients.delete(res);
    });

    try {
      this.watcher = fs.watch(config.root, { recursive: true }, () => {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.ctx.server.refreshGitInfo(); // 分支/脏数可能已变,先行刷新再广播
          this.broadcast('reload');
          this.broadcast('files');
        }, WATCH_DEBOUNCE_MS);
      });
    } catch {
      // watch unavailable - static only
    }
  }

  broadcast(ev: string, data: unknown = '') {
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
