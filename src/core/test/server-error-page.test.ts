/**
 * T4 server 错误页验收:
 * - sendErrorPage(res, code) 输出极简内联 HTML(Content-Type: text/html; charset=utf-8,
 *   标题/说明/返回首页链接);headersSent 后安全退出不再写头;
 * - 页面类路径(项目文件 404、根目录遍历 403)走 HTML 错误页;
 * - `/__` 前缀 API 路径(/__file-content 等)保持原样,不返回 HTML。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Context } from 'cordis';
import { ServerService, sendErrorPage } from '../server.js';

// ---------------------------------------------------------------------------
// 单元:sendErrorPage 纯输出(假 res,不占端口)
// ---------------------------------------------------------------------------

function fakeRes(headersSent = false) {
  const calls: { head: unknown[][]; body: string | Buffer | undefined; destroyed: number } = {
    head: [], body: undefined, destroyed: 0,
  };
  const res = {
    headersSent,
    writeHead(...args: unknown[]) { calls.head.push(args); return res; },
    end(body?: string | Buffer) { calls.body = body; },
    destroy() { calls.destroyed++; },
  };
  return { res: res as unknown as ServerResponse, calls };
}

describe('sendErrorPage(单元)', () => {
  it('404:Content-Type text/html; charset=utf-8,含状态码/说明/返回首页链接', () => {
    const { res, calls } = fakeRes();
    sendErrorPage(res, 404);
    const [status, headers] = calls.head[0]!;
    expect(status).toBe(404);
    expect((headers as Record<string, string>)['Content-Type']).toBe('text/html; charset=utf-8');
    const body = String(calls.body);
    expect(body).toContain('<!doctype html');
    expect(body).toContain('404');
    expect(body).toContain('<a href="/">');
    expect(body).toContain('返回首页');
  });

  it.each([[400, '请求无效'], [403, '没有访问权限'], [404, '页面不存在']] as const)(
    '%i:说明文案与状态码一致',
    (code, text) => {
      const { res, calls } = fakeRes();
      sendErrorPage(res, code);
      expect(calls.head[0]![0]).toBe(code);
      expect(String(calls.body)).toContain(text);
    },
  );

  it('headersSent 已置位 → 不再 writeHead,仅断开连接', () => {
    const { res, calls } = fakeRes(true);
    expect(() => sendErrorPage(res, 404)).not.toThrow();
    expect(calls.head.length).toBe(0);
    expect(calls.destroyed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 集成:真实 HTTP handler 接线(单 tmpdir 单服务,降低 Windows 临时目录抖动面)
// ---------------------------------------------------------------------------

function get(port: number, reqPath: string): Promise<{ status: number | undefined; contentType: string | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: reqPath }, (res: IncomingMessage) => {
      let body = '';
      res.on('data', (c: Buffer) => { body += c.toString(); });
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'], body }));
    });
    req.on('error', reject);
  });
}

let appDir: string;
let srv: { port: number; dispose: () => void };

beforeAll(async () => {
  appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-errpage-'));
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html><body>app</body></html>');
  srv = await new Promise((resolve, reject) => {
    const ctx = new Context();
    const timer = setTimeout(() => reject(new Error('server did not start')), 5000);
    ctx.plugin(ServerService, {
      root: appDir,
      appDir,
      port: 0,
      open: false,
      page: null,
      detect: { hasOpenspec: false, hasDocs: false, hasJust: false },
      onListen: (port: number) => {
        clearTimeout(timer);
        resolve({ port, dispose: () => { try { ctx.root.fiber.dispose(); } catch { /* ignore */ } } });
      },
    });
  });
});

afterAll(async () => {
  srv.dispose();
  await new Promise((r) => setTimeout(r, 300));
  fs.rmSync(appDir, { recursive: true, force: true });
});

describe('错误页接线(集成)', () => {
  it('页面路径不存在 /no-such-page → 404 HTML 错误页', async () => {
    const res = await get(srv.port, '/no-such-page');
    expect(res.status).toBe(404);
    expect(res.contentType).toContain('text/html');
    expect(res.body).toContain('返回首页');
  });

  it('根目录遍历 /..%2fescape → 403 HTML 错误页', async () => {
    const res = await get(srv.port, '/..%2fescape');
    expect(res.status).toBe(403);
    expect(res.contentType).toContain('text/html');
  });

  it('S1:appDir 越界 /__app/../x → 403 HTML 错误页(不再裸文本)', async () => {
    const res = await get(srv.port, '/__app/../x');
    expect(res.status).toBe(403);
    expect(res.contentType).toContain('text/html');
    expect(res.body).toContain('403');
  });

  it('S2:/__ 前缀根遍历 /__foo/../.. → 403 保持原文(非 HTML)', async () => {
    const res = await get(srv.port, '/__foo/../..');
    expect(res.status).toBe(403);
    expect(res.body).toBe('Forbidden');
    expect(res.contentType ?? '').not.toContain('text/html');
  });

  it('API 路径 /__file-content/missing → 404 保持原文(非 HTML)', async () => {
    const res = await get(srv.port, '/__file-content/missing.txt');
    expect(res.status).toBe(404);
    expect(res.body).toBe('Not found');
    expect(res.contentType ?? '').not.toContain('text/html');
  });
});
