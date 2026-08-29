/**
 * dashboard.json 存储死键剥离泛化(design 约定化扫描 change):
 * 收敛 view change 的 stripLegacyViewConfig 为通用规则 ——
 * 内置插件未声明 config 的段加载即清;已声明 config 仅保留声明键;
 * external 插件键保留;无 manifest 声明的存储键保留(无法判定,保守不清)。
 * 无变更/无记录不写盘;写盘走 tmp+rename 原子写。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RECORD_FILE, readPluginsConfig, stripDeadPluginConfig } from '../instance.js';
import type { ConfigSchemaInfo } from '../instance.js';

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

/** 内置插件投影:均不声明 config(design/view/stats/just 现状) */
const BUILTIN_NO_CONFIG: ConfigSchemaInfo[] = [
  { mode: 'stats' }, { mode: 'view' }, { mode: 'design' }, { mode: 'just' },
];

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('stripDeadPluginConfig — 死键剥离泛化(三分支)', () => {
  it('内置清除:未声明 config 的内置插件段整段移除', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: {
        view: { scanDirs: ['openspec'] },
        design: { folders: ['assets'] },
      },
    });

    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(true);

    const plugins = readPluginsConfig(root);
    expect(plugins).not.toHaveProperty('view');
    expect(plugins).not.toHaveProperty('design');
  });

  it('外部保留:external 标记的插件段原样保留', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: {
        view: { scanDirs: ['x'] },
        mytool: { api: 'http://x', depth: 3 },
      },
    });
    const manifests: ConfigSchemaInfo[] = [...BUILTIN_NO_CONFIG, { mode: 'mytool', external: true }];

    expect(stripDeadPluginConfig(root, manifests)).toBe(true);

    const plugins = readPluginsConfig(root);
    expect(plugins).not.toHaveProperty('view');
    expect(plugins.mytool).toEqual({ api: 'http://x', depth: 3 });
  });

  it('无声明不清除:存储键无 manifest 注册(未知/未加载插件)→ 原样保留', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: {
        view: { scanDirs: ['x'] },
        unknownPlugin: { whatever: true },
      },
    });

    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(true);

    const plugins = readPluginsConfig(root);
    expect(plugins).not.toHaveProperty('view');
    expect(plugins.unknownPlugin).toEqual({ whatever: true });
  });

  it('键级收敛:已声明 config 的内置插件仅保留声明键,未声明键清除', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: { widget: { keep: 'v1', legacyKey: 'dead' } },
    });
    const manifests: ConfigSchemaInfo[] = [
      ...BUILTIN_NO_CONFIG,
      { mode: 'widget', config: { keep: { type: 'string', label: '保留' } } },
    ];

    expect(stripDeadPluginConfig(root, manifests)).toBe(true);

    const plugins = readPluginsConfig(root);
    expect(plugins.widget).toEqual({ keep: 'v1' });
  });

  it('声明键全部存在 → 无变更不写盘(幂等),返回 false', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: { widget: { keep: 'v1' } },
    });
    const before = fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8');
    const manifests: ConfigSchemaInfo[] = [
      { mode: 'widget', config: { keep: { type: 'string', label: '保留' } } },
    ];

    expect(stripDeadPluginConfig(root, manifests)).toBe(false);
    expect(fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8')).toBe(before);
  });

  it('无死键 → 不写盘(幂等),返回 false', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 1,
      port: 4190,
      root,
      startedAt: '2026-08-28T00:00:00.000Z',
      plugins: { unknownPlugin: { folders: [] } },
    });
    const before = fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8');

    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(false);
    expect(fs.readFileSync(path.join(root, RECORD_FILE), 'utf-8')).toBe(before);
  });
});

describe('stripDeadPluginConfig — 安全边界', () => {
  it('剥离走 tmp+rename 原子写:写后无 .tmp 残留,记录其余字段不动', () => {
    const root = makeRoot();
    seedRecord(root, {
      pid: 42,
      port: 5000,
      root,
      startedAt: '2026-08-28T01:00:00.000Z',
      plugins: { view: { scanDirs: ['x'] } },
    });

    stripDeadPluginConfig(root, BUILTIN_NO_CONFIG);

    const rec = rawRecord(root);
    expect(rec.pid).toBe(42);
    expect(rec.port).toBe(5000);
    expect(rec.startedAt).toBe('2026-08-28T01:00:00.000Z');
    expect(fs.readdirSync(path.join(root, '.zdev')).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('无记录文件 → 安全跳过,返回 false 且不创建文件', () => {
    const root = makeRoot();
    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(false);
    expect(fs.existsSync(path.join(root, RECORD_FILE))).toBe(false);
  });

  it('记录损坏(非 JSON)→ 安全跳过不抛错', () => {
    const root = makeRoot();
    fs.mkdirSync(path.join(root, '.zdev'), { recursive: true });
    fs.writeFileSync(path.join(root, RECORD_FILE), '{not json');
    expect(() => stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).not.toThrow();
    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(false);
  });

  it('plugins 非对象 → 安全跳过', () => {
    const root = makeRoot();
    seedRecord(root, { pid: 1, port: 1, root, startedAt: 'x', plugins: 'oops' });
    expect(stripDeadPluginConfig(root, BUILTIN_NO_CONFIG)).toBe(false);
  });
});
