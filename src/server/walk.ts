import fs from 'node:fs';
import path from 'node:path';

export interface WalkOptions {
  skip?: Set<string>;
  maxDepth?: number;
  showHidden?: boolean;
  onFile?: (abs: string, rel: string) => void;
  onDir?: (abs: string, rel: string) => void;
}

export function walkDir(root: string, opts: WalkOptions = {}): void {
  const { skip = new Set(), maxDepth, showHidden, onFile, onDir } = opts;

  function walk(dir: string, rel: string, depth: number) {
    if (typeof maxDepth === 'number' && depth > maxDepth) return;
    let ents: fs.Dirent[];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      if (!showHidden && ent.name.startsWith('.')) continue;
      if (skip.has(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        onDir?.(abs, r);
        walk(abs, r, depth + 1);
      } else if (onFile) {
        onFile(abs, r);
      }
    }
  }

  walk(root, '', 0);
}
