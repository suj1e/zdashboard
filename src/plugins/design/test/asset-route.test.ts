/**
 * design 资产代理路由 GET /__design/asset 三分支验收:
 * 合法资产 200+MIME / 路径穿越(`..`/绝对/反斜杠/缺参) 400 / 文件缺失 404。
 * 资产基准根 = <root>/.zdev/design(约定化扫描同源)。
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { createFakeCtx } from '../../../sdk/test/helpers.js';

/** 可承载流式 pipe 的 res 桩:真 Writable 兜底 + writeHead/状态捕获面 */
type StreamRes = Writable & {
  statusCode: number;
  headers?: Record<string, unknown>;
  bodyText(): string;
};

function createStreamRes(): StreamRes {
  const chunks: Buffer[] = [];
  let status = 0;
  let headers: Record<string, unknown> | undefined;
  const res = new Writable({
    write(chunk: Buffer, _enc, cb) { chunks.push(chunk); cb(); },
  }) as StreamRes;
  Object.assign(res, {
    writeHead(s: number, h?: Record<string, unknown>) { status = s; headers = h; },
    bodyText: () => Buffer.concat(chunks).toString('utf8'),
  });
  Object.defineProperty(res, 'statusCode', { get: () => status });
  Object.defineProperty(res, 'headers', { get: () => headers });
  return res;
}

/** 流式响应异步完成,轮询直至 res.end() 被调用(2s 超时保底) */
async function drain(res: StreamRes): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!res.writableEnded && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function serveAsset(root: string, query: string): Promise<StreamRes> {
  const { ctx, routes } = createFakeCtx();
  const { apply } = await import('../index.js');
  apply.apply!(ctx as never, { root });
  const handler = routes.get('/__design/asset');
  if (!handler) throw new Error('route /__design/asset 未注册');
  const req = { headers: {}, url: `/__design/asset?${query}` } as never;
  const res = createStreamRes();
  await handler(req, res as never);
  await drain(res);
  return res;
}

function makeFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-design-asset-'));
  fs.mkdirSync(path.join(root, '.zdev', 'design', 'icons'), { recursive: true });
  fs.writeFileSync(path.join(root, '.zdev', 'design', 'icons', 'logo.svg'), '<svg/>');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'top-secret');
  return root;
}

describe('design 资产代理路由 GET /__design/asset', () => {
  it('合法资产 → 200 + 按 MIME 表 Content-Type(svg → image/svg+xml),流式回传文件内容', async () => {
    const root = makeFixture();
    try {
      const res = await serveAsset(root, 'path=' + encodeURIComponent('icons/logo.svg'));
      expect(res.statusCode).toBe(200);
      expect(res.headers?.['Content-Type']).toBe('image/svg+xml');
      expect(res.bodyText()).toBe('<svg/>');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('路径穿越/非法路径 → 400(不落盘读取)', async () => {
    const root = makeFixture();
    try {
      for (const bad of [
        'path=..%2Fsecret.txt',            // ../secret.txt
        'path=icons%2F..%2F..%2Fsecret.txt', // icons/../../secret.txt
        'path=..%5Csecret.txt',            // ..\secret.txt(反斜杠)
        'path=%2Fetc%2Fpasswd',            // 绝对路径
        '',                                // 缺参
      ]) {
        const res = await serveAsset(root, bad);
        expect(res.statusCode, `query="${bad}"`).toBe(400);
      }
      // 秘密文件内容从未被回传
      expect((await serveAsset(root, 'path=..%2Fsecret.txt')).bodyText()).not.toContain('top-secret');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('合法相对路径但文件缺失 → 404', async () => {
    const root = makeFixture();
    try {
      const res = await serveAsset(root, 'path=' + encodeURIComponent('icons/missing.svg'));
      expect(res.statusCode).toBe(404);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
