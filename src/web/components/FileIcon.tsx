import {
  FileText, FileCode, BookOpen, Image as ImageIcon, Braces, Terminal,
  Globe, FileSpreadsheet, FileJson, type LucideIcon,
} from 'lucide-react';

/** 文件类型 → 图标映射(view/design 两侧栏共用同一套视觉语言) */
const EXT_ICON: Record<string, LucideIcon> = {
  '.md': BookOpen, '.markdown': BookOpen, '.mdx': BookOpen,
  '.ts': FileCode, '.tsx': FileCode, '.js': FileCode, '.jsx': FileCode,
  '.mjs': FileCode, '.cjs': FileCode, '.mts': FileCode, '.cts': FileCode,
  '.css': FileCode, '.scss': FileCode, '.less': FileCode,
  '.html': Globe, '.htm': Globe,
  '.json': FileJson, '.yaml': Braces, '.yml': Braces, '.toml': Braces,
  '.csv': FileSpreadsheet, '.tsv': FileSpreadsheet,
  '.sh': Terminal, '.bash': Terminal, '.zsh': Terminal,
  '.sql': Terminal, '.py': FileCode, '.go': FileCode, '.rs': FileCode, '.java': FileCode,
  '.svg': ImageIcon, '.png': ImageIcon, '.jpg': ImageIcon, '.jpeg': ImageIcon,
  '.gif': ImageIcon, '.webp': ImageIcon, '.ico': ImageIcon,
};

export function fileIcon(name: string): LucideIcon {
  if (name.toLowerCase() === 'justfile' || name.toLowerCase() === 'makefile') return Terminal;
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  return EXT_ICON[ext] ?? FileText;
}

export function FileIcon({ name, active }: { name: string; active?: boolean }) {
  const Icon = fileIcon(name);
  return <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />;
}
