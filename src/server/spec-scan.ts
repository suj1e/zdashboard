import fs from 'node:fs';
import path from 'node:path';

export type NodeKind = 'file' | 'dir' | 'log';
export interface TreeNode {
  name: string;
  kind: NodeKind;
  path?: string; // file: 相对 root 的路径(点击预览用)
  defaultCollapsed?: boolean;
  children?: TreeNode[];
}

function walkFiles(absDir: string, relDir: string, depth = 0): TreeNode[] {
  if (depth > 4) return [];
  let ents: fs.Dirent[];
  try { ents = fs.readdirSync(absDir, { withFileTypes: true }); } catch { return []; }
  const nodes: TreeNode[] = [];
  for (const ent of ents) {
    if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
    const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      nodes.push({ name: ent.name, kind: 'dir', children: walkFiles(path.join(absDir, ent.name), rel, depth + 1) });
    } else {
      nodes.push({ name: ent.name, kind: 'file', path: rel });
    }
  }
  nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1));
  return nodes;
}

/** 方案模式树形扫描:openspec 感知 + docs 聚合 + 其他兜底 */
export function scanTree(root: string, hasOpenspec: boolean, hasDocs: boolean): TreeNode[] {
  const tree: TreeNode[] = [];
  if (hasOpenspec && fs.existsSync(path.join(root, 'openspec', 'changes'))) {
    const changesDir = path.join(root, 'openspec', 'changes');
    const active: TreeNode[] = [];
    const archived: TreeNode[] = [];
    for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name === 'archive') continue;
      active.push({ name: ent.name, kind: 'dir', children: walkFiles(path.join(changesDir, ent.name), `openspec/changes/${ent.name}`) });
    }
    active.sort((a, b) => a.name.localeCompare(b.name));
    const archiveDir = path.join(changesDir, 'archive');
    if (fs.existsSync(archiveDir)) {
      for (const ent of fs.readdirSync(archiveDir, { withFileTypes: true })) {
        if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
        archived.push({ name: ent.name, kind: 'dir', children: walkFiles(path.join(archiveDir, ent.name), `openspec/changes/archive/${ent.name}`) });
      }
      archived.sort((a, b) => b.name.localeCompare(a.name)); // 日期前缀倒序
    }
    if (active.length) tree.push({ name: `changes (${active.length})`, kind: 'dir', children: active });
    if (archived.length) tree.push({ name: `archive (${archived.length})`, kind: 'dir', defaultCollapsed: true, children: archived });
    const specsDir = path.join(root, 'openspec', 'specs');
    if (fs.existsSync(specsDir)) {
      const specs = walkFiles(specsDir, 'openspec/specs');
      if (specs.length) tree.push({ name: 'specs', kind: 'dir', children: specs });
    }
  }
  if (hasDocs && fs.existsSync(path.join(root, 'docs'))) {
    const docs = walkFiles(path.join(root, 'docs'), 'docs');
    if (docs.length) tree.push({ name: 'docs', kind: 'dir', children: docs });
  }
  const skip = new Set(['openspec', 'docs', 'node_modules', '.git', 'dist', 'test-server']); // .zworktree 以 . 开头已被点前缀过滤
  // "其他"只收根目录的 md 文档(README/CLAUDE 等);构建配置(pom.xml/justfile 等)不收——对"方案+日志"定位是噪音
  const etc: TreeNode[] = [];
  try {
    for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
      if (ent.name.startsWith('.') || skip.has(ent.name)) continue;
      const ext = path.extname(ent.name).toLowerCase();
      if (ent.isFile() && (ext === '.md' || ext === '.markdown')) etc.push({ name: ent.name, kind: 'file', path: ent.name });
    }
  } catch (e) { console.error('[zdashboard] scan root etc failed:', e); }
  etc.sort((a, b) => a.name.localeCompare(b.name));
  if (etc.length) tree.push({ name: `other (${etc.length})`, kind: 'dir', children: etc });
  return tree;
}
