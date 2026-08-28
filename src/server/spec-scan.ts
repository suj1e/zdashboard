import fs from 'node:fs';
import path from 'node:path';
import { walkDir } from './walk.js';

export type NodeKind = 'file' | 'dir' | 'log';
export interface TreeNode {
  name: string;
  kind: NodeKind;
  path?: string;
  defaultCollapsed?: boolean;
  children?: TreeNode[];
}

function buildTree(paths: string[], defaultExpandDepth = 2): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const p of paths) {
    const parts = p.split('/');
    let current = '';
    let parent = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      current = current ? `${current}/${part}` : part;
      const isLast = i === parts.length - 1;
      const depth = i;

      if (!map.has(current)) {
        const isDir = !isLast;
        const collapsed = isDir && typeof defaultExpandDepth === 'number' && depth > defaultExpandDepth;
        const node: TreeNode = {
          name: part,
          kind: isLast ? 'file' : 'dir',
          ...(collapsed ? { defaultCollapsed: true } : {}),
          ...(isLast ? { path: p } : { children: [] }),
        };
        map.set(current, node);
        parent.push(node);
      }

      if (!isLast) {
        parent = map.get(current)!.children!;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  };

  sortNodes(root);
  return root;
}

export interface ScanTreeOptions {
  defaultExpandDepth?: number;
}

function prefixPaths(nodes: TreeNode[], prefix: string): TreeNode[] {
  return nodes.map((n) => {
    if (n.kind === 'file' && n.path) {
      return { ...n, path: `${prefix}/${n.path}` };
    }
    if (n.children) {
      return { ...n, children: prefixPaths(n.children, prefix) };
    }
    return n;
  });
}

/** 方案模式树形扫描:按 scanDirs 白名单扫描 */
export function scanTree(root: string, scanDirs: string[], opts?: ScanTreeOptions): TreeNode[] {
  const tree: TreeNode[] = [];
  const defaultExpandDepth = typeof opts?.defaultExpandDepth === 'number' ? opts.defaultExpandDepth : 2;
  const dirs = Array.isArray(scanDirs) ? scanDirs.filter((d) => typeof d === 'string' && d) : [];
  for (const dir of dirs) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) continue;
    const paths: string[] = [];
    walkDir(dirPath, { maxDepth: 4, onFile: (_, rel) => paths.push(rel) });
    const prefix = dir;
      const children = prefixPaths(buildTree(paths, defaultExpandDepth), prefix);
      if (children.length) {
        tree.push({ name: `${dir} (${children.length})`, kind: 'dir', children });
      }
  }
  return tree;
}
