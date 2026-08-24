import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pkg from '../../package.json' with { type: 'json' };
import type { Context } from 'cordis';
import type { DetectResult } from '../server/detect.js';
import { Service } from 'cordis';
import { clearRecord } from './instance.js';
import { openUrl } from './open-url.js';
import { execFile } from 'node:child_process';

const VERSION = pkg.version;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  root: string;
  appDir: string;
  port: number;
  open: boolean;
  page: string | null;
  detect: DetectResult;
  dataDir?: string;
  onListen?: (port: number) => void;
}

declare module 'cordis' {
  interface Context {
    server: ServerService;
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8', '.csv': 'text/plain; charset=utf-8',
  '.tsv': 'text/plain; charset=utf-8', '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.py': 'text/plain; charset=utf-8', '.ts': 'text/plain; charset=utf-8',
  '.java': 'text/plain; charset=utf-8', '.go': 'text/plain; charset=utf-8',
  '.rs': 'text/plain; charset=utf-8', '.rb': 'text/plain; charset=utf-8',
  '.php': 'text/plain; charset=utf-8', '.c': 'text/plain; charset=utf-8',
  '.cpp': 'text/plain; charset=utf-8', '.h': 'text/plain; charset=utf-8',
  '.cs': 'text/plain; charset=utf-8', '.swift': 'text/plain; charset=utf-8',
  '.kt': 'text/plain; charset=utf-8', '.scala': 'text/plain; charset=utf-8',
  '.sh': 'text/plain; charset=utf-8', '.bash': 'text/plain; charset=utf-8',
  '.zsh': 'text/plain; charset=utf-8', '.fish': 'text/plain; charset=utf-8',
  '.env': 'text/plain; charset=utf-8', '.gitignore': 'text/plain; charset=utf-8',
  '.dockerfile': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/woff',
  '.map': 'application/json; charset=utf-8',
};

const INJECT = `<script>(function(){try{var es=new EventSource('/__reload');es.addEventListener('files',function(){/* plugin 局部刷新由 useSSE 消费,此处不再整页 reload */});es.onerror=function(){/* EventSource 原生重连,静默处理 */};}catch(e){}document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest){var a=t.closest('a[target]');if(a&&a.target!=='_self'){a.target='_self';}}},true);})();</script>`;

export const PLUGIN_STATIC_PREFIX = '/__plugin/';

export class ServerService extends Service {
  stopToken: string;
  private root: string;
  private appDir: string;
  private open: boolean;
  private page: string | null;
  private det: DetectResult;
  private dataDir?: string;
  private routes = new Map<string, (req: http.IncomingMessage, res: http.ServerResponse) => void>();
  private sses = new Map<string, (res: http.ServerResponse) => (() => void) | void>();
  private prefixStatic = new Map<string, string>();
  private server?: http.Server;
  private onListen?: (port: number) => void;

  constructor(ctx: Context, config: ServerOptions) {
    super(ctx, 'server');
    this.stopToken = crypto.randomBytes(12).toString('hex');
    this.root = config.root;
    this.appDir = config.appDir;
    this.open = config.open;
    this.page = config.page;
    this.det = config.detect;
    this.dataDir = config.dataDir;
    this.onListen = config.onListen;
    ctx.effect(() => () => this.dispose());

    this.refreshGitInfo();
    this.route('/__config', (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify({ stopToken: this.stopToken, version: VERSION, root: this.root, ...this.gitInfo }));
    });

    this.route('/__stop', async (req, res) => {
      if (req.headers['x-stop-token'] !== this.stopToken) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end('{"ok":true}');
      this.stop();
    });

    this.start(config.port);
  }


  route(path: string, handler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    this.routes.set(path, handler);
    this.ctx.effect(() => () => this.routes.delete(path));
  }

  sse(path: string, onConnect: (res: http.ServerResponse) => (() => void) | void) {
    this.sses.set(path, onConnect);
    this.ctx.effect(() => () => this.sses.delete(path));
  }

  static(prefix: string, dir: string) {
    this.prefixStatic.set(prefix, dir);
    this.ctx.effect(() => () => this.prefixStatic.delete(prefix));
  }

  private serveFile(filePath: string, req: http.IncomingMessage, res: http.ServerResponse, injectHtml: boolean) {
    fs.stat(filePath, (err, stat) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(filePath).toLowerCase();
      const ct = MIME[ext] ?? 'application/octet-stream';

      // ---- HTTP Range support ----
      const rangeHeader = (req.headers['range'] as string | undefined);
      let range: { start: number; end: number } | null = null;
      if (rangeHeader) {
        const m = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
        if (m) {
          const start = Number(m[1]);
          const end   = m[2] !== '' ? Number(m[2]) : stat.size - 1;
          if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end && start < stat.size) {
            range = { start, end: Math.min(end, stat.size - 1) };
          }
          // malformed range → fall through to 200 full response
        }
        // unparseable range header → fall through to 200 full response
      }

      if (range) {
        const { start, end } = range;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Type': ct,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        });
        // stat 成功后文件仍可能在 open 前被删/换(高频增删的工作区),流错误无人接会崩进程
        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', () => { try { res.destroy(); } catch { /* 已断 */ } });
        stream.pipe(res);
        return;
      }

      // Full response
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        let body: string | Buffer = data;
        if (injectHtml && ext === '.html') {
          const s = data.toString('utf8');
          body = Buffer.from(s.indexOf('</body>') >= 0 ? s.replace('</body>', INJECT + '</body>') : s + INJECT);
        }
        res.writeHead(200, { 'Content-Type': ct, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
        res.end(body);
      });
    });
  }

  private servePrefix(url: string, req: http.IncomingMessage, res: http.ServerResponse): boolean {
    for (const [prefix, dir] of this.prefixStatic) {
      if (url.indexOf(prefix) === 0) {
        let rel = this.safeDecode(url.slice(prefix.length));
        if (!rel || rel === '/' || !path.extname(rel)) rel = path.join(rel || '', 'index.html');
        const fp = path.join(dir, rel);
        if (fp.indexOf(dir + path.sep) !== 0) { res.writeHead(403); res.end('Forbidden'); return false; }
        this.serveFile(fp, req, res, true);
        return true;
      }
    }
    return false;
  }

  private safeDecode(raw: string): string {
    try { return decodeURIComponent(raw); } catch { return raw; }
  }

  private handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    try {
      const rawUrl = req.url || '/';
      const url = rawUrl.split('?')[0];

      const rh = this.routes.get(url);
      if (rh) { rh(req, res); return; }
      const sh = this.sses.get(url);
      if (sh) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(': connected\n\n');
        const cleanup = sh(res);
        req.on('close', () => { cleanup?.(); });
        return;
      }

      if (this.servePrefix(url, req, res)) return;

      if (url === '/' || url.indexOf('/__app/') === 0 || url.indexOf('/assets/') === 0) {
        let fp = this.appDir;
        if (url !== '/') fp = path.join(this.appDir, this.safeDecode(url));
        if (url.indexOf('/__app/') === 0) fp = path.join(this.appDir, url.slice(7));
        if (fp !== this.appDir && fp.indexOf(this.appDir + path.sep) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
        if (url === '/') fp = path.join(this.appDir, 'index.html');
        return this.serveFile(fp, req, res, false);
      }

      const fp = path.join(this.root, this.safeDecode(url));
      if (fp !== this.root && fp.indexOf(this.root + path.sep) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
      return this.serveFile(fp, req, res, true);
    } catch (e) {
      try { res.writeHead(400); res.end('bad request'); } catch {}
      console.error('[zdashboard] handler error', e);
    }
  };

  start(port: number) {
    this.server = http.createServer(this.handler);
    // 浏览器复用空闲 keep-alive 连接时若已被服务端关闭,请求会石沉大海(点击无响应)。
    // 拉长 keep-alive 使其远大于浏览器侧空闲窗口
    this.server.keepAliveTimeout = 65_000;
    this.server.headersTimeout = 66_000;
    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[zdashboard] port ${port} busy, trying ${port + 1}`);
        this.start(port + 1);
      } else throw err;
    });
    this.server.listen(port, '127.0.0.1', () => {
      const u = `http://localhost:${port}`;
      const target = this.page ? `${u}#${this.page}` : u;
      console.log(`[zdashboard] v${VERSION} dashboard -> ${u}`);
      console.log(`[zdashboard] project   -> ${this.root}`);
      console.log(`[zdashboard] detect    -> openspec:${this.det.hasOpenspec} docs:${this.det.hasDocs} just:${this.det.hasJust} bugs:${this.det.hasBugs}`);
      if (this.dataDir) console.log(`[zdashboard] data      -> ${this.dataDir}`);
      if (this.open) openUrl(target);
      this.onListen?.(port);
    });
  }

  /** 项目 git 信息(分支/脏文件数),启动探测一次,文件变更时刷新 */
  private gitInfo: { branch?: string; dirty?: number } = {};

  refreshGitInfo() {
    const run = (args: string[]) => new Promise<string>((resolve) => {
      execFile('git', args, { cwd: this.root, timeout: 3000 }, (err, stdout) => resolve(err ? '' : stdout));
    });
    void (async () => {
      const [branch, status] = await Promise.all([
        run(['rev-parse', '--abbrev-ref', 'HEAD']),
        run(['status', '--porcelain']),
      ]);
      const b = branch.trim();
      this.gitInfo = b ? { branch: b, dirty: status ? status.split('\n').filter(Boolean).length : 0 } : {};
    })();
  }

  stop() {
    if (this.server) { try { this.server.close(); } catch {} }
    try { clearRecord(this.root); } catch {}
    setTimeout(() => {
      try { this.ctx.root.fiber.dispose(); } catch {}
      process.exit(0);
    }, 50);
  }

  dispose() {
    if (this.server) { try { this.server.close(); } catch {} }
    try { clearRecord(this.root); } catch {}
  }
}
