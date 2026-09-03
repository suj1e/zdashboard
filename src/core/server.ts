import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pkg from '../../package.json' with { type: 'json' };
import type { Context } from 'cordis';
import type { DetectResult, DetectResponse } from '../server/detect.js';
import { detectLiveShape } from '../server/detect.js';
import type { PluginManifest, ConfigField } from '../core/manifest.js';
import { Service } from 'cordis';
import { clearRecord, readPluginsConfig, writePluginsConfig } from './instance.js';
import { openUrl } from './open-url.js';
import { readBody } from './read-body.js';
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
  host?: string;
  onListen?: (port: number) => void;
}

declare module 'cordis' {
  interface Context {
    server: ServerService;
  }
}

/** 扩展名 → Content-Type 表(SDK 插件路由等复用,勿在他处复制) */
export const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.pdf': 'application/pdf',
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

// 静态 HTML 注入脚本:仅保留 _self 链接补丁(文件预览页内跳转留在当前窗口)。
// 旧 EventSource('/__reload') 注入已随沙箱收紧移除——sandbox=allow-scripts 下 iframe
// 为不透明源,/__reload 属跨域请求,只会制造 console error 且其处理器本已为空。
const INJECT = `<script>(function(){document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest){var a=t.closest('a[target]');if(a&&a.target!=='_self'){a.target='_self';}}},true);})();</script>`;

export const PLUGIN_STATIC_PREFIX = '/__plugin/';

/** json 响应助手:统一 Content-Type/缓存头与序列化,消灭 writeHead 样板 */
export function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(data));
}

/** 错误码 → 中文说明(极简错误页单源) */
const ERROR_PAGE_TEXT: Record<number, string> = {
  400: '请求无效',
  403: '没有访问权限',
  404: '页面不存在',
};

/**
 * 极简 HTML 错误页:标题/说明/返回首页链接,零外部资源(离线可用)。
 * 页面类路径(项目文件/静态资源)404/403 专用;`/__` 前缀 API 路径保持 JSON/原文不变。
 */
export function sendErrorPage(res: http.ServerResponse, code: number): void {
  if (res.headersSent) {
    // 头已发出(响应中途出错):不能再改状态码,只断开连接防悬挂
    try { res.destroy(); } catch { /* 已断 */ }
    return;
  }
  const text = ERROR_PAGE_TEXT[code] ?? '出错了';
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">` +
    `<title>${code} ${text} · zdashboard</title></head>` +
    `<body><h1>${code} · ${text}</h1><p>请求的资源不可用或已被移动。</p>` +
    `<p><a href="/">返回首页</a></p></body></html>`,
  );
}

/** x-stop-token 鉴权助手:通过返回 true;未通过时已写 403 响应并返回 false */
export function guarded(req: http.IncomingMessage, res: http.ServerResponse, token: string): boolean {
  if (req.headers['x-stop-token'] !== token) {
    res.writeHead(403);
    res.end('forbidden');
    return false;
  }
  return true;
}

export class ServerService extends Service {
  stopToken: string;
  private root: string;
  private appDir: string;
  private open: boolean;
  private page: string | null;
  private det: DetectResult;
  private dataDir?: string;
  private host: string;
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
    this.host = config.host ?? '127.0.0.1';
    this.onListen = config.onListen;
    ctx.effect(() => () => this.dispose());

    this.refreshGitInfo();
    this.route('/__config', (_req, res) => {
      json(res, { stopToken: this.stopToken, version: VERSION, root: this.root, ...this.gitInfo });
    });

    // 独立探测接口(轻量,替代 HomeGrid 借道 /__files 全量树)
    this.route('/__detect', async (_req, res) => {
      const shape: DetectResponse = await detectLiveShape(this.root);
      json(res, shape);
    });

    // 应用级静态文件(index.html 引用但不在 /assets/ 下),避免落到项目目录 404
    this.route('/favicon.svg', (req, res) => {
      this.serveFile(path.join(this.appDir, 'favicon.svg'), req, res, false);
    });

    this.route('/__file-content', async (req, res) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const rawPath = url.pathname.replace(/^\/__file-content\/?/, '');
      if (!rawPath || rawPath === '/') {
        res.writeHead(400);
        res.end('missing path');
        return;
      }
      const filePath = path.join(this.root, decodeURIComponent(rawPath));
      if (!filePath.startsWith(this.root + path.sep) && filePath !== this.root) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(filePath, (err) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        const ext = path.extname(filePath).toLowerCase();
        const ct = MIME[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
        fs.createReadStream(filePath).pipe(res);
      });
    });

    this.route('/__stop', async (req, res) => {
      if (!guarded(req, res, this.stopToken)) return;
      json(res, { ok: true });
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

  private pluginsConfig: Record<string, Record<string, unknown>> = {};

  getPluginConfig(mode: string): Record<string, unknown> {
    return this.pluginsConfig[mode] ?? {};
  }

  refreshPluginsConfig() {
    this.pluginsConfig = readPluginsConfig(this.root);
  }

  savePluginConfig(merged: Record<string, Record<string, unknown>>) {
    this.pluginsConfig = merged;
    writePluginsConfig(this.root, merged);
  }

  private serveFile(filePath: string, req: http.IncomingMessage, res: http.ServerResponse, injectHtml: boolean) {
    // `/__` 前缀为 API/插件资源路径:错误保持原样(不换 HTML 错误页)
    const apiPath = (req.url || '').startsWith('/__');
    fs.stat(filePath, (err, stat) => {
      if (err) {
        if (apiPath) { res.writeHead(404); return res.end('Not found'); }
        return sendErrorPage(res, 404);
      }
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
        if (err) {
          if (apiPath) { res.writeHead(404); return res.end('Not found'); }
          return sendErrorPage(res, 404);
        }
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
    for (const [rp, rh2] of this.routes) {
      if (url.startsWith(rp + '/')) { rh2(req, res); return; }
    }
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
        if (fp !== this.appDir && fp.indexOf(this.appDir + path.sep) !== 0) { return sendErrorPage(res, 403); }
        if (url === '/') fp = path.join(this.appDir, 'index.html');
        return this.serveFile(fp, req, res, false);
      }

      const fp = path.join(this.root, this.safeDecode(url));
      if (fp !== this.root && fp.indexOf(this.root + path.sep) !== 0) {
        // `/__` 前缀 API 路径错误保持原文(S2);页面类路径走 HTML 错误页
        if ((req.url || '').startsWith('/__')) { res.writeHead(403); return res.end('Forbidden'); }
        return sendErrorPage(res, 403);
      }
      return this.serveFile(fp, req, res, true);
    } catch (e) {
      // 兜底错误:API 路径保持原文(S2),页面类 400 错误页;头已发出时 sendErrorPage 仅断连
      try {
        if ((req.url || '').startsWith('/__')) { res.writeHead(400); res.end('bad request'); }
        else sendErrorPage(res, 400);
      } catch { /* 已断 */ }
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
    this.server.listen(port, this.host, () => {
      // port=0(测试/随机端口)时上报实际绑定端口
      const addr = this.server?.address();
      const bound = typeof addr === 'object' && addr ? addr.port : port;
      const loopback = this.host === '127.0.0.1' || this.host === 'localhost' || this.host === '::1';
      const u = `http://localhost:${bound}`;
      const target = this.page ? `${u}#${this.page}` : u;
      console.log(`[zdashboard] v${VERSION} dashboard -> ${u}`);
      console.log(`[zdashboard] project   -> ${this.root}`);
      console.log(`[zdashboard] detect    -> openspec:${this.det.hasOpenspec} docs:${this.det.hasDocs} just:${this.det.hasJust}`);
      if (this.dataDir) console.log(`[zdashboard] data      -> ${this.dataDir}`);
      if (!loopback) console.log(`[zdashboard] host      -> ${this.host}(非回环监听:局域网/Tailscale 可访问;无鉴权,注意网络边界)`);
      if (this.open) openUrl(target);
      this.onListen?.(bound);
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
