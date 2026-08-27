/**
 * T7 顺延义务:/favicon.svg 路由回归钉(应用级静态文件,避免落到项目目录 404)。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Context } from 'cordis';
import { ServerService } from '../server.js';

/** jsdom 环境无 Node fetch 的部分全局,直接用 node:http 请求 */
import http from 'node:http';

const FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16"/></svg>';

function startServer(appDir: string): Promise<{ port: number; dispose: () => void }> {
  return new Promise((resolve, reject) => {
    const ctx = new Context();
    ctx.plugin(ServerService, {
      root: appDir,
      appDir,
      port: 0,
      open: false,
      page: null,
      detect: { hasOpenspec: false, hasDocs: false, hasJust: false },
      onListen: (port: number) => resolve({ port, dispose: () => { try { ctx.root.fiber.dispose(); } catch { /* ignore */ } } }),
    });
    setTimeout(() => reject(new Error('server did not start')), 5000);
  });
}

function get(port: number, reqPath: string): Promise<{ status: number | undefined; contentType: string | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: reqPath }, (res) => {
      let body = '';
      res.on('data', (c: Buffer) => { body += c.toString(); });
      res.on('end', () => resolve({
        status: res.statusCode,
        contentType: res.headers['content-type'],
        body,
      }));
    });
    req.on('error', reject);
  });
}

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('ServerService — /favicon.svg 路由', () => {
  it('favicon.svg 由 appDir 提供且 Content-Type 为 image/svg+xml', async () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-favicon-'));
    tmpDirs.push(appDir);
    fs.writeFileSync(path.join(appDir, 'favicon.svg'), FAVICON_SVG);

    const { port, dispose } = await startServer(appDir);
    try {
      const res = await get(port, '/favicon.svg');
      expect(res.status).toBe(200);
      expect(res.contentType).toContain('image/svg+xml');
      expect(res.body).toContain('<svg');
    } finally {
      dispose();
    }
  });

  it('favicon.svg 不存在 → 404(而非落到项目目录误服务)', async () => {
    const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-favicon-empty-'));
    tmpDirs.push(appDir);
    fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');

    const { port, dispose } = await startServer(appDir);
    try {
      const res = await get(port, '/favicon.svg');
      expect(res.status).toBe(404);
    } finally {
      dispose();
    }
  });
});
