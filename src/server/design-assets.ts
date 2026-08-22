import fs from 'node:fs';
import path from 'node:path';
import { walkDir } from './walk.js';

export type AssetType = 'page' | 'component' | 'icon' | 'token' | 'md' | 'video' | 'audio' | 'pdf' | 'font' | 'other';

const PAGE_EXTS = ['.html', '.htm'];
const ICON_EXTS = ['.svg', '.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.ogg', '.ogv'];
const AUDIO_EXTS = ['.mp3', '.wav', '.flac', '.aac', '.m4a'];
const CODE_EXTS = ['.js', '.mjs', '.cjs', '.mts', '.cts', '.ts', '.tsx', '.jsx', '.css', '.json', '.txt', '.xml', '.yml', '.yaml', '.sh', '.md'];
const FONT_EXTS = ['.woff', '.woff2', '.ttf', '.otf'];
const TOKEN_RE = /token|theme|design|color|palette|typograph/i;

export function categorize(rel: string, ext: string): AssetType | null {
  if (rel.indexOf('components/') === 0) return 'component';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.md') return 'md';
  if (FONT_EXTS.includes(ext)) return 'font';
  if (ICON_EXTS.includes(ext)) return 'icon';
  if (PAGE_EXTS.includes(ext)) return 'page';
  if (CODE_EXTS.includes(ext)) {
    if (TOKEN_RE.test(rel) && (ext === '.css' || ext === '.json')) return 'token';
    return null;
  }
  return 'other';
}

export interface AssetFile { path: string; name: string; ext: string; type: AssetType; }
export type ScanResult = Record<AssetType, AssetFile[]>;

export function scanAssets(root: string): ScanResult {
  const out: ScanResult = {} as ScanResult;
  const keys: AssetType[] = ['page','component','icon','token','md','video','audio','pdf','font','other'];
  for (const k of keys) out[k] = [];
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache']);
  walkDir(root, { skip: SKIP, onFile: (abs, rel) => {
    const ext = path.extname(abs).toLowerCase();
    const t = categorize(rel, ext);
    if (t) out[t].push({ path: rel, name: path.basename(abs), ext, type: t });
  }});
  return out;
}
