/**
 * dashboard.json 存储残留清理(view 约定化扫描 change):
 * view 不再声明 config(manifest.config 已删),记录文件里的 plugins.view 段
 * 成死键——启动一次性剥离,tmp+rename 原子写,其余 plugins 配置原样保留。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RECORD_FILE, readPluginsConfig, stripLegacyViewConfig } from '../instance.js';

const tmpDirs: string[] = [];
function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-strip-'));
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

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('stripLegacyViewConfig — plugins.view 死键剥离', () => {
  it('含残留 view 键的记录:加载(剥离)后 view 消失,其余 plugins 配置保留', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: {
        view: { scanDirs: ['openspec'], defaultExpandDepth: 2, showHidden: true },
        design: { folders: ['assets'] },
        just: { timeout: 30 },
      },
    });

    expect(stripLegacyViewConfig(root)).toBe(true);

    const plugins = readPluginsConfig(root);
    expect(plugins).not.toHaveProperty('view');
    expect(plugins.design).toEqual({ folders: ['assets'] });
    expect(plugins.just).toEqual({ timeout: 30 });
  });

  it('剥离走 tmp+rename 原子写:写后无 .tmp 残留,记录其余字段不动', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 42,
      port: 5000,
      root,
      startedAt: '2026-08-28T01:00:00.000Z',
      plugins: { view: { scanDirs: ['x'] } },
    });

    stripLegacyViewConfig(root);

    const rec = rawRecord(root);
    expect(rec.pid).toBe(42);
    expect(rec.port).toBe(5000);
    expect(rec.startedAt).toBe('2026-08-28T01:00:00.000Z');
    expect(fs.readdirSync(path.join(root, '.zdev')).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('无 view 死键 → 不写盘(幂等),返回 false', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: { design: { folders: [] } },
    });
    const before = fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8');

    expect(stripLegacyViewConfig(root)).toBe(false);
    expect(fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8')).toBe(before);
  });

  it('无记录文件 → 安全跳过,返回 false 且不创建文件', () => {
    const root = makeRoot();
    expect(stripLegacyViewConfig(root)).toBe(false);
    expect(fs.existsSync(path.join(root, RECORD_FILE))).toBe(false);
  });

  it('记录损坏(非 JSON)→ 安全跳过不抛错', () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, '.zdev'), { recursive: true });
    fs.writeFileSync(path.join(root, RECORD_FILE), '{not json');
    expect(() => stripLegacyViewConfig(root)).not.toThrow();
    expect(stripLegacyViewConfig(root)).toBe(false);
  });

  it('plugins 非对象 → 安全跳过', () => {
    const root = makeRoot();
    seedRecord(root, { pid: 1, port: 1, root, startedAt: 'x', plugins: 'oops' });
    expect(stripLegacyViewConfig(root)).toBe(false);
  });
});
