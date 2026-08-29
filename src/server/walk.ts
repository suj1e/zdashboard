import fs from 'node:fs';
import path from 'node:path';

export interface WalkOptions {
  skip?: Set<string>;
  maxDepth?: number;
  /** true 时点前缀「目录」不跳过(供显式列入 dotDirs 的扫描目录使用);点前缀「文件」仍恒跳过 */
  allowDotDirs?: boolean;
  onFile?: (abs: string, rel: string) => void;
  onDir?: (abs: string, rel: string) => void;
}

export function walkDir(root: string, opts: WalkOptions = {}): void {
  const { skip = new Set(), maxDepth, allowDotDirs = false, onFile, onDir } = opts;

  function walk(dir: string, rel: string, depth: number) {
    if (typeof maxDepth === 'number' && depth > maxDepth) return;
    let ents: fs.Dirent[];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      // 点前缀最小例外:仅目录可经 allowDotDirs 放行,文件一律跳过
      if (ent.name.startsWith('.') && !(allowDotDirs && ent.isDirectory())) continue;
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
