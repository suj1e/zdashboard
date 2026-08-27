import fs from 'node:fs';
import http from 'node:http';
import { Service } from 'cordis';
import type { Context } from 'cordis';

declare module 'cordis' {
  interface Context {
    reload: ReloadService;
  }
}

const WATCH_DEBOUNCE_MS = 300;

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
      this.watcher = fs.watch(config.root, { recursive: true }, (eventType, filename) => {
        if (filename && /^(?:\.git|node_modules|dist|\.pnpm)(?:[/\\]|$)/.test(filename)) return;
        if (filename && /\.(?:swp|tmp)$|~$|^\.DS_Store$|^Thumbs\.db$/i.test(filename)) return;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.ctx.server.refreshGitInfo();
          this.broadcast('reload');
          this.broadcast('files');
          this.timer = undefined;
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

  /** 插件专用频道:plugin:<mode>:<event>,客户端 usePluginData subscribe 消费 */
  broadcastPlugin(mode: string, event: string, data: unknown = '') {
    this.broadcast(`plugin:${mode}:${event}`, data);
  }

  dispose() {
    if (this.watcher) { try { this.watcher.close(); } catch {} }
    if (this.timer) { clearTimeout(this.timer); }
    for (const c of this.clients) { try { c.end(); } catch {} }
    this.clients.clear();
  }
}
