/**
 * walkDir 点前缀例外(allowDotDirs)单测:
 * - 缺省 false:点前缀目录与文件一律跳过(既有行为不变);
 * - true:仅点前缀「目录」放行,点前缀「文件」仍跳过(最小例外,不放大扫描面);
 * - 既有 skip 集合与 maxDepth 语义不受影响,maxDepth 4 覆盖 .zdev/apply/runs/<id>/state.json。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { walkDir, type WalkOptions } from '../walk.js';

const tmpDirs: string[] = [];
function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-walk-'));
  tmpDirs.push(dir);
  return dir;
}
function write(root: string, rel: string, content = 'x'): void {
  const fp = path.join(root, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
}

function collect(root: string, opts?: Omit<WalkOptions, 'onFile' | 'onDir'>): string[] {
  const files: string[] = [];
  walkDir(root, { ...opts, onFile: (_, rel) => files.push(rel) });
  return files.sort();
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('walkDir — allowDotDirs 点目录例外', () => {
  it('缺省(false):点前缀目录与文件一律跳过(行为不变)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/runs/r1/state.json');
    write(root, '.hidden/secret.txt');
    write(root, '.dotfile');
    write(root, 'visible.md');

    expect(collect(root)).toEqual(['visible.md']);
  });

  it('allowDotDirs:true → 点前缀目录被遍历,目录内文件可见', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT');
    write(root, '.zdev/apply/runs/r1/state.json');

    expect(collect(root, { allowDotDirs: true })).toEqual([
      '.zdev/apply/CURRENT',
      '.zdev/apply/runs/r1/state.json',
    ]);
  });

  it('allowDotDirs:true 放行目录内部嵌套点前缀子目录随子树一并进树(walk 全程生效)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/.cache/inner.txt');
    write(root, '.zdev/apply/runs/r1/state.json');

    expect(collect(root, { allowDotDirs: true })).toEqual([
      '.zdev/apply/.cache/inner.txt',
      '.zdev/apply/runs/r1/state.json',
    ]);
  });

  it('allowDotDirs:true 点前缀文件仍跳过(仅目录例外)', () => {
    const root = makeRoot();
    write(root, '.dotfile');
    write(root, '.zdir/f.md');
    write(root, 'visible.md');

    expect(collect(root, { allowDotDirs: true })).toEqual(['.zdir/f.md', 'visible.md']);
  });

  it('allowDotDirs:true 既有 skip 集合仍生效(node_modules 不受例外影响)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT');
    write(root, 'node_modules/pkg/index.js');

    expect(collect(root, { allowDotDirs: true, skip: new Set(['node_modules']) })).toEqual([
      '.zdev/apply/CURRENT',
    ]);
  });

  it('maxDepth 4 覆盖 .zdev/apply/runs/<id>/state.json(3 层),maxDepth 2 不及', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/runs/2026-08-28-2128/state.json');

    expect(collect(root, { allowDotDirs: true, maxDepth: 4 })).toEqual([
      '.zdev/apply/runs/2026-08-28-2128/state.json',
    ]);
    expect(collect(root, { allowDotDirs: true, maxDepth: 2 })).toEqual([]);
  });
});
