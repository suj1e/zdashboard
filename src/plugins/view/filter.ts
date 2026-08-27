/** view 文件树过滤匹配(纯函数,Sidebar 与单测共用) */
import type { TreeNode } from '../../server/spec-scan.js';

export function matches(node: TreeNode, q: string): boolean {
  if (!q) return true;
  if (node.name.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => matches(c, q));
}
