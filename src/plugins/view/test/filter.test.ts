/**
 * T2 view:文件树过滤匹配(从 Sidebar 抽出为纯函数以便单测)。
 */
import { describe, it, expect } from 'vitest';
import { matches } from '../filter.js';
import type { TreeNode } from '../../../server/spec-scan.js';

const tree: TreeNode[] = [
  { name: 'openspec', kind: 'dir', path: 'openspec', children: [
    { name: 'changes', kind: 'dir', path: 'openspec/changes', children: [
      { name: 'plugin-platform-plugins', kind: 'dir', path: 'openspec/changes/plugin-platform-plugins', children: [
        { name: 'tasks.md', kind: 'file', path: 'openspec/changes/plugin-platform-plugins/tasks.md' },
      ] },
    ] },
  ] },
  { name: 'README.md', kind: 'file', path: 'README.md' },
];

describe('view filter.matches — 树过滤匹配', () => {
  it('空过滤词匹配一切', () => {
    expect(matches(tree[0], '')).toBe(true);
    expect(matches(tree[1], '')).toBe(true);
  });

  it('文件名命中(大小写不敏感)', () => {
    expect(matches(tree[1], 'readme')).toBe(true);
    expect(matches(tree[1], 'readme.md')).toBe(true);
    expect(matches(tree[1], 'nope')).toBe(false);
  });

  it('子树命中则目录命中(递归)', () => {
    expect(matches(tree[0], 'tasks.md')).toBe(true);
    expect(matches(tree[0], 'changes')).toBe(true);
    expect(matches(tree[0], 'zzz')).toBe(false);
  });
});
