import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ReloadService } from '../reload.js';
import { detectLiveShape } from '../../server/detect.js';

function createFakeCtx() {
  let sseHandler: ((res: unknown) => (() => void) | void) | null = null;
  const cleanups: Array<() => void> = [];
  const ctx = {
    server: {
      sse: vi.fn((_path: string, handler: (res: unknown) => (() => void) | void) => { sseHandler = handler; }),
    },
    effect: vi.fn((fn: () => () => void) => { cleanups.push(fn()); }),
    // cordis Service 基类构造时会向 registry 提供自身
    reflect: { provide: vi.fn() },
  };
  return { ctx, getSseHandler: () => sseHandler, cleanups };
}

describe('ReloadService.broadcastPlugin', () => {
  it('广播到 plugin:<mode>:<event> 频道且携带 JSON data', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-reload-test-'));
    try {
      const { ctx, getSseHandler } = createFakeCtx();
      const svc = new ReloadService(ctx as never, { root: tmp });
      // 模拟一个 SSE 客户端
      const written: string[] = [];
      const client = {
        write(payload: string) { written.push(payload); },
        end() {},
      };
      getSseHandler()!(client);
      svc.broadcastPlugin('just', 'finished', { id: 7 });
      expect(written).toHaveLength(1);
      expect(written[0]).toContain('event: plugin:just:finished');
      expect(written[0]).toContain('"id":7');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('detectLiveShape — /__detect 响应形状', () => {
  it('形状收敛为三个真实探测位(openspec/docs/just),无 bugs 期残留字段', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-detect-test-'));
    try {
      const shape = await detectLiveShape(tmp);
      // 键集合全等即排除一切残留字段(bugs 期兼容位)
      expect(Object.keys(shape).sort()).toEqual(['hasDocs', 'hasJust', 'hasOpenspec']);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
