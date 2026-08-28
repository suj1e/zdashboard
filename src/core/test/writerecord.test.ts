/**
 * writeRecord 读改写保留 plugins 段(fix change):
 * writeRecord 被 cli onListen 每次监听成功调用,原实现整体盲写导致 plugins 段跨重启清零。
 * 契约:读旧记录(容错)沿用其 plugins 字段,仅更新 pid/port/root/startedAt;
 * 无记录/损坏 JSON 兜底最小记录;写盘走 tmp+rename 原子写,无 .tmp 残留。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RECORD_FILE, writeRecord } from '../instance.js';

const tmpDirs: string[] = [];
function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-writerecord-'));
  tmpDirs.push(dir);
  return dir;
}

function seedRecord(root: string, record: unknown): void {
  fs.mkdirSync(path.join(root, '.zdev'), { recursive: true });
  fs.writeFileSync(path.join(root, RECORD_FILE), JSON.stringify(record, null, 2) + '\n');
}

function rawRecord(root: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8'));
}

const OLD_STARTED_AT = '2026-08-28T00:00:00.000Z';

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('writeRecord — plugins 保留读改写(四分支)', () => {
  it('有 plugins:原样保留,且 pid/port/startedAt 更新为新值', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 42,
      port: 5000,
      root,
      startedAt: OLD_STARTED_AT,
      plugins: { mytool: { api: 'http://x', depth: 3 } },
    });

    writeRecord(root, 5001);

    const rec = rawRecord(root);
    expect(rec.plugins).toEqual({ mytool: { api: 'http://x', depth: 3 } });
    expect(rec.pid).toBe(process.pid);
    expect(rec.port).toBe(5001);
    expect(rec.root).toBe(root);
    expect(rec.startedAt).not.toBe(OLD_STARTED_AT);
  });

  it('无 plugins:写入后不新增 plugins 键', () => {
    const root = makeRoot();
    seedRecord(root, { pid: 42, port: 5000, root, startedAt: OLD_STARTED_AT });

    writeRecord(root, 5001);

    const rec = rawRecord(root);
    expect(rec).not.toHaveProperty('plugins');
    expect(rec.pid).toBe(process.pid);
    expect(rec.port).toBe(5001);
  });

  it('损坏 JSON:兜底新建最小记录,不抛错且无 plugins 键', () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, '.zdev'), { recursive: true });
    fs.writeFileSync(path.join(root, RECORD_FILE), '{not json');

    expect(() => writeRecord(root, 5001)).not.toThrow();

    const rec = rawRecord(root);
    expect(rec.pid).toBe(process.pid);
    expect(rec.port).toBe(5001);
    expect(rec.root).toBe(root);
    expect(rec).not.toHaveProperty('plugins');
  });

  it('tmp+rename 原子写:写后无 .tmp 残留,最终记录可解析', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 42,
      port: 5000,
      root,
      startedAt: OLD_STARTED_AT,
      plugins: { mytool: { api: 'http://x' } },
    });

    writeRecord(root, 5001);

    const files = fs.readdirSync(path.join(root, '.zdev'));
    expect(files.filter((f) => f.endsWith('.tmp'))).toEqual([]);
    const rec = rawRecord(root);
    expect(rec.port).toBe(5001);
    expect(rec.plugins).toEqual({ mytool: { api: 'http://x' } });
  });
});
