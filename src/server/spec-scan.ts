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
  hiddenDirs?: string[];
  showHidden?: boolean;
  defaultExpandDepth?: number;
}

/** 方案模式树形扫描:openspec 感知 + docs 聚合 + 其他兜底 */
export function scanTree(root: string, hasOpenspec: boolean, hasDocs: boolean, opts?: ScanTreeOptions): TreeNode[] {
  const tree: TreeNode[] = [];
  const defaultExpandDepth = typeof opts?.defaultExpandDepth === 'number' ? opts.defaultExpandDepth : 2;
  if (hasOpenspec && fs.existsSync(path.join(root, 'openspec', 'changes'))) {
    const changesDir = path.join(root, 'openspec', 'changes');
    const active: TreeNode[] = [];
    const archived: TreeNode[] = [];
    for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name === 'archive') continue;
      const relBase = `openspec/changes/${ent.name}`;
      const paths: string[] = [];
      walkDir(path.join(changesDir, ent.name), { maxDepth: 4, showHidden: opts?.showHidden, onFile: (_, rel) => paths.push(rel ? `${ent.name}/${rel}` : ent.name) });
      const children = buildTree(paths, defaultExpandDepth).map((n) => ({ ...n, path: n.path ? `${relBase}/${n.path}` : undefined }));
      active.push({ name: ent.name, kind: 'dir', children });
    }
    active.sort((a, b) => a.name.localeCompare(b.name));
    const archiveDir = path.join(changesDir, 'archive');
    if (fs.existsSync(archiveDir)) {
      for (const ent of fs.readdirSync(archiveDir, { withFileTypes: true })) {
        if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
        const relBase = `openspec/changes/archive/${ent.name}`;
        const paths: string[] = [];
        walkDir(path.join(archiveDir, ent.name), { maxDepth: 4, showHidden: opts?.showHidden, onFile: (_, rel) => paths.push(rel ? `${ent.name}/${rel}` : ent.name) });
        const children = buildTree(paths, defaultExpandDepth).map((n) => ({ ...n, path: n.path ? `${relBase}/${n.path}` : undefined }));
        archived.push({ name: ent.name, kind: 'dir', children });
      }
      archived.sort((a, b) => b.name.localeCompare(a.name)); // 日期前缀倒序
    }
    if (active.length) tree.push({ name: `changes (${active.length})`, kind: 'dir', children: active });
    if (archived.length) tree.push({ name: `archive (${archived.length})`, kind: 'dir', defaultCollapsed: true, children: archived });
    const specsDir = path.join(root, 'openspec', 'specs');
    if (fs.existsSync(specsDir)) {
      const paths: string[] = [];
      walkDir(specsDir, { maxDepth: 4, showHidden: opts?.showHidden, onFile: (_, rel) => paths.push(rel) });
      const specs = buildTree(paths, defaultExpandDepth).map((n) => ({ ...n, path: n.path ? `openspec/specs/${n.path}` : undefined }));
      if (specs.length) tree.push({ name: 'specs', kind: 'dir', children: specs });
    }
  }
  if (hasDocs && fs.existsSync(path.join(root, 'docs'))) {
    const paths: string[] = [];
    walkDir(path.join(root, 'docs'), { maxDepth: 4, showHidden: opts?.showHidden, onFile: (_, rel) => paths.push(rel) });
    const docs = buildTree(paths, defaultExpandDepth).map((n) => ({ ...n, path: n.path ? `docs/${n.path}` : undefined }));
    if (docs.length) tree.push({ name: 'docs', kind: 'dir', children: docs });
  }
  const skip = new Set(['openspec', 'docs', 'node_modules', '.git', 'dist', 'playground', '.zreview']);
  if (Array.isArray(opts?.hiddenDirs)) {
    for (const d of opts.hiddenDirs) skip.add(d);
  }
  // "其他"只收根目录的 md 文档(README/CLAUDE 等);构建配置(pom.xml/justfile 等)不收——对"方案+日志"定位是噪音
  const etc: TreeNode[] = [];
  try {
    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      if (!opts?.showHidden && ent.name.startsWith('.')) continue;
      if (skip.has(ent.name)) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (ent.isFile() && (ext === '.md' || ext === '.markdown')) etc.push({ name: ent.name, kind: 'file', path: ent.name });
    }
  } catch (e) { console.error('[zdashboard] scan root etc failed:', e); }
  etc.sort((a, b) => a.name.localeCompare(b.name));
  if (etc.length) tree.push({ name: `other (${etc.length})`, kind: 'dir', children: etc });
  return tree;
}
