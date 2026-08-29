/**
 * view 约定化扫描:scanTree 白名单模型单测。
 * - 约定目录(openspec/docs)存在 → 各成组且含文件;
 * - 约定目录缺失 → 静默跳过,不产生空组;
 * - 展开深度固定(默认 2),超过深度的目录 defaultCollapsed;
 * - 文件 path 带约定目录前缀(与 /__files 契约一致,预览按相对根解析);
 * - ScanTreeOptions 收敛为 { defaultExpandDepth, dotDirs } — showHidden/hiddenDirs 已删除,
 *   传入也不生效(隐藏文件恒不进树),类型面由 typecheck 钉住;
 * - 点前缀 scanDir 须经 dotDirs 显式声明才可扫(如 .zdev/apply),未声明整组跳过。
 */
import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanTree, type ScanTreeOptions } from '../spec-scan.js';

/** 选项面收敛的编译期钉:除 defaultExpandDepth/dotDirs 外不得有其他键 */
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
const _optionsConverged: Equal<keyof ScanTreeOptions, 'defaultExpandDepth' | 'dotDirs'> = true;

const tmpDirs: string[] = [];
function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zd-scan-'));
  tmpDirs.push(dir);
  return dir;
}
function write(root: string, rel: string, content = 'x'): void {
  const fp = path.join(root, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content);
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('scanTree — 约定目录白名单扫描', () => {
  it('约定目录存在 → openspec 与 docs 各成组,组内含文件', () => {
    const root = makeRoot();
    write(root, 'openspec/project.md');
    write(root, 'openspec/specs/a/spec.md');
    write(root, 'docs/README.md');

    const tree = scanTree(root, ['openspec', 'docs']);

    expect(tree.map((n) => n.name)).toEqual(['openspec (2)', 'docs (1)']);
    expect(tree[0].children?.map((n) => n.name).sort()).toEqual(['project.md', 'specs']);
    expect(tree[1].children?.map((n) => n.name)).toEqual(['README.md']);
  });

  it('约定目录缺失 → 静默跳过,不产生空组', () => {
    const root = makeRoot();
    write(root, 'openspec/project.md');
    // docs 不存在

    const tree = scanTree(root, ['openspec', 'docs']);

    expect(tree.map((n) => n.name)).toEqual(['openspec (1)']);
  });

  it('约定目录全缺失 → 空树', () => {
    const root = makeRoot();
    expect(scanTree(root, ['openspec', 'docs'])).toEqual([]);
  });

  it('展开深度固定为 2(组内相对深度):第 3 层及以内展开,更深层 defaultCollapsed', () => {
    const root = makeRoot();
    // 深度按组内相对深度计(不含组目录层):d1(0) d2(1) d3(2) 展开,d4(3) 折叠
    write(root, 'openspec/d1/d2/d3/d4/deep.md');
    write(root, 'openspec/d1/shallow.md');

    const tree = scanTree(root, ['openspec']);
    const group = tree[0];
    const d1 = group.children!.find((n) => n.name === 'd1')!;
    const d2 = d1.children!.find((n) => n.name === 'd2')!;
    const d3 = d2.children!.find((n) => n.name === 'd3')!;
    const d4 = d3.children!.find((n) => n.name === 'd4')!;

    expect(d1.defaultCollapsed).toBeUndefined(); // 0 > 2 不成立 → 展开
    expect(d2.defaultCollapsed).toBeUndefined(); // 1 > 2 不成立 → 展开
    expect(d3.defaultCollapsed).toBeUndefined(); // 2 > 2 不成立 → 展开
    expect(d4.defaultCollapsed).toBe(true);      // 3 > 2 → 折叠
  });

  it('defaultExpandDepth 覆写生效(仍是唯一保留选项)', () => {
    const root = makeRoot();
    write(root, 'openspec/a/b/c/deep.md');

    const tree = scanTree(root, ['openspec'], { defaultExpandDepth: 0 });
    const a = tree[0].children!.find((n) => n.name === 'a')!;
    const b = a.children!.find((n) => n.name === 'b')!;
    expect(a.defaultCollapsed).toBeUndefined(); // 0 > 0 不成立 → 展开
    expect(b.defaultCollapsed).toBe(true);      // 1 > 0 → 折叠
  });

  it('文件 path 带约定目录前缀(相对 scanRoot 可解析)', () => {
    const root = makeRoot();
    write(root, 'openspec/specs/a/spec.md');
    write(root, 'docs/guide.md');

    const tree = scanTree(root, ['openspec', 'docs']);
    const collect = (nodes: ReturnType<typeof scanTree>): string[] =>
      nodes.flatMap((n) => (n.kind === 'file' && n.path ? [n.path] : collect(n.children ?? [])));

    expect(collect(tree).sort()).toEqual(['docs/guide.md', 'openspec/specs/a/spec.md']);
  });

  it('目录排序:组内目录在前、文件按名排序;组间按 scanDirs 声明序', () => {
    const root = makeRoot();
    write(root, 'docs/z.md');
    write(root, 'docs/inner/f.md');
    write(root, 'docs/a.md');

    const tree = scanTree(root, ['docs']);
    expect(tree[0].children?.map((n) => n.name)).toEqual(['inner', 'a.md', 'z.md']);
  });

  it('showHidden 选项已删除:隐藏文件恒不进树(传入也不生效)', () => {
    const root = makeRoot();
    write(root, 'openspec/.hidden-spec.md');
    write(root, 'openspec/visible.md');

    // 收敛后 ScanTreeOptions 无 showHidden;运行时传入多余键也不得改变行为
    const tree = scanTree(root, ['openspec'], { showHidden: true } as never);
    const names = JSON.stringify(tree);
    expect(names).not.toContain('.hidden-spec.md');
    expect(names).toContain('visible.md');
  });

  it('路径前缀完整:文件 path 恒以组目录名开头', () => {
    const root = makeRoot();
    write(root, 'openspec/a.md');
    write(root, 'openspec/sub/b.md');

    const tree = scanTree(root, ['openspec', 'docs']);
    const files = JSON.stringify(tree);
    expect(files).toContain('openspec/a.md');
    expect(files).toContain('openspec/sub/b.md');
  });
});

describe('scanTree — dotDirs 点前缀 scanDir 显式声明(.zdev/apply)', () => {
  it('dotDirs 声明 → 分组以原名出现且含 CURRENT/state.json(maxDepth 4 覆盖 runs/<id> 三层)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT', 'runs/2026-08-28-2128');
    write(root, '.zdev/apply/runs/2026-08-28-2128/state.json', '{}');
    write(root, '.zdev/apply/runs/2026-08-28-2128/plan.md', '# plan');

    const tree = scanTree(root, ['openspec', '.zdev/apply'], { dotDirs: ['.zdev/apply'] });

    const group = tree.find((n) => n.name === '.zdev/apply (2)');
    expect(group, '组名用目录原名 + 计数(顶层 children:CURRENT + runs)').toBeDefined();
    const files = JSON.stringify(group);
    expect(files).toContain('.zdev/apply/CURRENT');
    expect(files).toContain('.zdev/apply/runs/2026-08-28-2128/state.json');
    expect(files).toContain('.zdev/apply/runs/2026-08-28-2128/plan.md');
  });

  it('未声明 dotDirs 的点前缀目录 → 整组跳过不出现(声明才可扫)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT');
    write(root, '.zdev/apply/runs/r1/state.json');

    const tree = scanTree(root, ['.zdev/apply']);

    expect(tree).toEqual([]);
  });

  it('dotDirs 只放行声明目录:未声明的其他点前缀目录仍跳过', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT');
    write(root, '.other/secret.txt');

    const tree = scanTree(root, ['.zdev/apply', '.other'], { dotDirs: ['.zdev/apply'] });

    expect(tree.map((n) => n.name)).toEqual(['.zdev/apply (1)']);
  });

  it('dotDirs 放行目录内的点前缀文件仍不进树(例外仅目录)', () => {
    const root = makeRoot();
    write(root, '.zdev/apply/CURRENT');
    write(root, '.zdev/apply/.dotfile');

    const tree = scanTree(root, ['.zdev/apply'], { dotDirs: ['.zdev/apply'] });

    const files = JSON.stringify(tree);
    expect(files).toContain('CURRENT');
    expect(files).not.toContain('.dotfile');
  });
});
