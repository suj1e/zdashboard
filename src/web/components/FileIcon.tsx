import type { IconKey } from '../lib/icons.js';
import { useIcons } from '../lib/icons.js';

/** 文件类型 → 图标 key 映射 */
const EXT_GROUP: Record<string, IconKey> = {
  '.md': 'md', '.markdown': 'md', '.mdx': 'md',
  '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx',
  '.mjs': 'mjs', '.cjs': 'mjs', '.mts': 'mjs', '.cts': 'mjs',
  '.css': 'css', '.scss': 'css', '.less': 'css',
  '.html': 'html', '.htm': 'html',
  '.json': 'json', '.yaml': 'json', '.yml': 'json', '.toml': 'json',
  '.csv': 'csv', '.tsv': 'csv',
  '.sh': 'sh', '.bash': 'sh', '.zsh': 'sh',
  '.sql': 'sh', '.py': 'py', '.go': 'py', '.rs': 'py', '.java': 'py',
  '.svg': 'svg', '.png': 'svg', '.jpg': 'svg', '.jpeg': 'svg',
  '.gif': 'svg', '.webp': 'svg', '.ico': 'svg',
};

export function fileIconKey(name: string): IconKey {
  const lower = name.toLowerCase();
  if (lower === 'justfile' || lower === 'makefile') return lower as IconKey;
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  return (EXT_GROUP[ext] ?? 'unknown') as IconKey;
}

export function FileIcon({ name, active }: { name: string; active?: boolean }) {
  const { icon } = useIcons();
  const iconNode = icon(fileIconKey(name));
  if (!iconNode) return null;
  return (
    <span className={`h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center ${active ? 'text-primary' : 'text-muted-foreground'}`}>
      {iconNode}
    </span>
  );
}
