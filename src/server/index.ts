import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanTree } from './spec-scan.js';
import { JustRunner } from './just-runner.js';
import { fetchBugs } from './bugs.js';
import { registerBuiltin, allBuiltins, type DashboardPlugin } from './plugins.js';
import { ReviewStore, type ItemState, type ReviewStatus } from './review-store.js';
import { scanAssets } from './design-assets.js';
import type { DetectResult } from './detect.js';
import pkg from '../../package.json' with { type: 'json' };

const VERSION = pkg.version;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOP_TOKEN = crypto.randomBytes(12).toString('hex');
const INJECT = `<script>(function(){try{var es=new EventSource('/__reload');es.addEventListener('reload',function(){location.reload();});es.onerror=function(){es.close();};}catch(e){}document.addEventListener('click',function(e){var t=e.target;if(t&&t.closest){var a=t.closest('a[target]');if(a&&a.target!=='_self'){a.target='_self';}}},true);})();</script>`;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8', '.yaml': 'text/yaml; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

export interface ServerOptions {
  root: string;
  port?: number;
  open?: boolean;
  detect: DetectResult;
  dashboardDir?: string;
  mode?: string;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

export function createServer(opts: ServerOptions) {
  const ROOT = path.resolve(opts.root);
  const PORT0 = opts.port ?? 4190;
  const OPEN = !!opts.open;
  const APP_DIR = opts.dashboardDir ?? path.resolve(__dirname, 'web');
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  const det = opts.detect;
  const runner = new JustRunner(ROOT);
  const MODE = opts.mode;

  // register builtin plugins (server-side: apiRoutes only; viewer loaded by frontend)
  registerBuiltin({
    mode: 'bugs', label: '禅道 Bugs', icon: '🎯',
    apiRoutes: { '/__bugs': async (_, res) => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' }); fetchBugs(ROOT).then((r) => res.end(JSON.stringify(r))); } }
  });
  registerBuiltin({ mode: 'view', label: '项目浏览', icon: '👁️' });

  const reviewStore = new ReviewStore(ROOT);
  registerBuiltin({
    mode: 'review', label: '文档评审', icon: '✅',
    apiRoutes: {
      '/__review': async (_, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(reviewStore.read()));
      },
      '/__review/item': async (req, res) => {
        if (req.headers['x-stop-token'] !== STOP_TOKEN) { res.writeHead(403); res.end('forbidden'); return; }
        (async () => {
          try {
            const body = JSON.parse(await readBody(req) || '{}');
            const data = reviewStore.updateItem(body.id, { answer: body.answer, state: body.state as ItemState | undefined });
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        })();
        return;
      },
      '/__review/status': async (req, res) => {
        if (req.headers['x-stop-token'] !== STOP_TOKEN) { res.writeHead(403); res.end('forbidden'); return; }
        (async () => {
          try {
            const body = JSON.parse(await readBody(req) || '{}');
            const data = reviewStore.setStatus(body.status as ReviewStatus);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(data));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: (e as Error).message }));
          }
        })();
        return;
      },
      '/__docs': async (_, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(reviewStore.docs()));
      },
    }
  });

  registerBuiltin({ mode: 'design', label: '设计资产', icon: '🎨' });

  const clients = new Set<http.ServerResponse>();
  const broadcast = (ev: string, data: unknown = '') => {
    const payload = `event: ${ev}\ndata: ${JSON.stringify(data == null ? '' : data)}\n\n`;
    for (const c of clients) c.write(payload);
  };

  function serveFile(filePath: string, res: http.ServerResponse, injectHtml: boolean) {
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      const ext = path.extname(filePath).toLowerCase();
      const ct = MIME[ext] ?? 'application/octet-stream';
      let body = data;
      if (injectHtml && ext === '.html') {
        const s = data.toString('utf8');
        body = Buffer.from(s.indexOf('</body>') >= 0 ? s.replace('</body>', INJECT + '</body>') : s + INJECT);
      }
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
      res.end(body);
    });
  }

  function handler(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url!.split('?')[0];

    // ── SSE:文件变更 ──
    if (url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url === '/__config') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify({ stopToken: STOP_TOKEN }));
    }
    if (url === '/__stop' && req.method === 'POST') {
      if (req.headers['x-stop-token'] === STOP_TOKEN) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end('{"ok":true}');
        runner.stop();
        setTimeout(() => { try { server.close(); } catch (e) { console.error('[zdashboard] server close failed:', e); } process.exit(0); }, 50);
      } else { res.writeHead(403); res.end('forbidden'); }
      return;
    }

    // ── 方案模式:树形文件清单(+探测结果) / 设计模式:资产分类清单 ──
    if (url === '/__files') {
      if (MODE === 'design') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(JSON.stringify(scanAssets(ROOT)));
      }
      const tree = scanTree(ROOT, det.hasOpenspec, det.hasDocs);
      const payload: TreeNodePayload = { tree, ...det };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(JSON.stringify(payload));
    }

    // ── 日志能力 ──
    if (url === '/__just/recipes') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
      runner.recipes().then((r) => res.end(JSON.stringify(r)));
      return;
    }
    if (url === '/__just/logs') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      const unsub = runner.subscribe((ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`));
      req.on('close', unsub);
      return;
    }
    const justAction = url.match(/^\/__just\/(start|stop|restart)$/);
    if (justAction && req.method === 'POST') {
      (async () => {
        if (req.headers['x-stop-token'] !== STOP_TOKEN) { res.writeHead(403); res.end('forbidden'); return; }
        const body = await readBody(req);
        let recipe: string | undefined;
        try { recipe = JSON.parse(body || '{}').recipe; } catch (e) { console.error('[zdashboard] invalid just action body:', e); }
        const act = justAction[1];
        if (act === 'start' || act === 'restart') {
          const target = recipe ?? runner.info().recipe;
          if (!target) { res.writeHead(400); res.end('{"error":"no recipe"}'); return; }
          const recipes = await runner.recipes();
          if (!recipes.some((r) => r.name === target)) { res.writeHead(403); res.end('{"error":"unknown recipe"}'); return; }
          runner.start(target);
        } else {
          runner.stop();
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(runner.info()));
      })();
      return;
    }

    // ── plugin API routes ──
    let handled = false;
    for (const plugin of allBuiltins()) {
      if (!plugin.apiRoutes) continue;
      for (const [route, handler] of Object.entries(plugin.apiRoutes)) {
        if (url === route) {
          handled = true;
          handler(req, res, ROOT);
          return;
        }
      }
    }

    // ── dashboard 前端 ──
    if (url === '/') return serveFile(path.join(APP_DIR, 'index.html'), res, false);
    if (url.indexOf('/__app/') === 0) {
      const fp = path.join(APP_DIR, url.slice(7));
      if (fp !== APP_DIR && fp.indexOf(APP_DIR + path.sep) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
      return serveFile(fp, res, false);
    }
    if (url.indexOf('/assets/') === 0) {
      const fp = path.join(APP_DIR, decodeURIComponent(url));
      if (fp.indexOf(APP_DIR + path.sep) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
      return serveFile(fp, res, false);
    }

    // ── 用户资产 ──
    const fp = path.join(ROOT, decodeURIComponent(url));
    if (fp !== ROOT && fp.indexOf(ROOT + path.sep) !== 0) { res.writeHead(403); return res.end('Forbidden'); }
    return serveFile(fp, res, true);
  }

  let server: http.Server;
  function start(port: number) {
    server = http.createServer(handler);
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') { console.log(`[zdashboard] port ${port} busy, trying ${port + 1}`); start(port + 1); }
      else throw err;
    });
    server.listen(port, () => {
      const u = `http://localhost:${port}`;
      console.log(`[zdashboard] v${VERSION} dashboard -> ${u}`);
      console.log(`[zdashboard] project   -> ${ROOT}`);
      console.log(`[zdashboard] mode      -> ${MODE ?? '(auto)'}`);
      console.log(`[zdashboard] detect    -> openspec:${det.hasOpenspec} docs:${det.hasDocs} just:${det.hasJust} bugs:${det.hasBugs}`);
      if (OPEN) exec(process.platform === 'darwin' ? `open ${u}` : `start ${u}`);
    });
  }

  let debounce: NodeJS.Timeout;
  try {
    fs.watch(ROOT, { recursive: true }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        broadcast('reload');
        broadcast('files');
        console.log(`[zdashboard] change -> reload + refresh tree (${clients.size} client${clients.size === 1 ? '' : 's'})`);
      }, 150);
    });
  } catch { console.log('[zdashboard] watch unavailable - static only.'); }

  start(PORT0);
}

interface TreeNodePayload { tree: unknown; hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean; }
