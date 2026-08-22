/**
 * Icon registry: 当前主题图标集。
 *
 * 设计边界：按钮/链接等内联装饰图标（如 <Play />、<Square />）不纳入，
 * 仅覆盖集中映射点：FileIcon、两侧栏 GROUP_ICON、EmptyState、IconRail 首页。
 */

import * as lucide from 'lucide-react';
import * as pixelReact from 'pixelarticons/react/index.js';
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// pixelarticons 适配层：将其“无组件导出”的 SVG 包包装为 LucideIcon 兼容组件
// ---------------------------------------------------------------------------

/** pixelarticons: kebab 名 → PascalCase 导出组件(react/index.js 导出为 AiFile/Archive/... ) */
function toPascal(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^([a-z])/, (m) => m.toUpperCase());
}
function PixelIcon({ name, className, ...rest }: { name: string; className?: string } & Record<string, unknown>) {
  const Cmp = (pixelReact as Record<string, React.ComponentType<{ className?: string }>>)[toPascal(name)];
  if (!Cmp) return null;
  return <Cmp className={className} {...rest} />;
}

// ---------------------------------------------------------------------------
// Icon key 类型
// ---------------------------------------------------------------------------

// FileIcon 扩展名映射
type FileExt =
  | 'md' | 'markdown' | 'mdx'
  | 'ts' | 'tsx' | 'js' | 'jsx'
  | 'mjs' | 'cjs' | 'mts' | 'cts'
  | 'css' | 'scss' | 'less'
  | 'html' | 'htm'
  | 'json' | 'yaml' | 'yml' | 'toml'
  | 'csv' | 'tsv'
  | 'sh' | 'bash' | 'zsh'
  | 'sql' | 'py' | 'go' | 'rs' | 'java'
  | 'svg' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'ico'
  | 'justfile' | 'makefile' | 'unknown';

// view Sidebar GROUP_ICON
type ViewGroup = 'group:changes' | 'group:archive' | 'group:specs' | 'group:docs' | 'group:other';

// design Sidebar GROUP_ICON
type DesignGroup =
  | 'group:page' | 'group:component' | 'group:icon' | 'group:token'
  | 'group:md' | 'group:video' | 'group:audio' | 'group:pdf' | 'group:font';

// EmptyState
type EmptyStateKey = 'empty:muted' | 'empty:primary';

// IconRail
type RailKey = 'rail:home';

export type IconKey = FileExt | ViewGroup | DesignGroup | EmptyStateKey | RailKey;

type IconComponent = React.ComponentType<{ className?: string }>;

// ---------------------------------------------------------------------------
// Default 集 (lucide)
// ---------------------------------------------------------------------------

const defaultSet: Record<IconKey, IconComponent> = {
  // FileIcon
  md: lucide.BookOpen, markdown: lucide.BookOpen, mdx: lucide.BookOpen,
  ts: lucide.FileCode, tsx: lucide.FileCode, js: lucide.FileCode, jsx: lucide.FileCode,
  mjs: lucide.FileCode, cjs: lucide.FileCode, mts: lucide.FileCode, cts: lucide.FileCode,
  css: lucide.FileCode, scss: lucide.FileCode, less: lucide.FileCode,
  html: lucide.Globe, htm: lucide.Globe,
  json: lucide.FileJson, yaml: lucide.Braces, yml: lucide.Braces, toml: lucide.Braces,
  csv: lucide.FileSpreadsheet, tsv: lucide.FileSpreadsheet,
  sh: lucide.Terminal, bash: lucide.Terminal, zsh: lucide.Terminal,
  sql: lucide.Terminal, py: lucide.FileCode, go: lucide.FileCode, rs: lucide.FileCode, java: lucide.FileCode,
  svg: lucide.Image, png: lucide.Image, jpg: lucide.Image, jpeg: lucide.Image,
  gif: lucide.Image, webp: lucide.Image, ico: lucide.Image,
  justfile: lucide.Terminal, makefile: lucide.Terminal, unknown: lucide.FileText,

  // view Sidebar GROUP_ICON
  'group:changes': lucide.ListTodo,
  'group:archive': lucide.Boxes,
  'group:specs': lucide.ShieldCheck,
  'group:docs': lucide.BookOpen,
  'group:other': lucide.Package,

  // design Sidebar GROUP_ICON
  'group:page': lucide.Monitor,
  'group:component': lucide.Blocks,
  'group:icon': lucide.Shapes,
  'group:token': lucide.Palette,
  'group:md': lucide.BookOpen,
  'group:video': lucide.Video,
  'group:audio': lucide.AudioLines,
  'group:pdf': lucide.FileText,
  'group:font': lucide.Type,

  // EmptyState
  'empty:muted': lucide.Inbox,
  'empty:primary': lucide.Sparkles,

  // IconRail
  'rail:home': lucide.Home,
};

// ---------------------------------------------------------------------------
// Pixel 集 (pixelarticons + lucide fallback)
// ---------------------------------------------------------------------------

const pixelSet: Record<IconKey, IconComponent> = {
  // FileIcon — pixelarticons 文件类(存在名: file/file-text/code/image)
  md: () => <PixelIcon name="file-text" />, markdown: () => <PixelIcon name="file-text" />, mdx: () => <PixelIcon name="file-text" />,
  ts: () => <PixelIcon name="code" />, tsx: () => <PixelIcon name="code" />, js: () => <PixelIcon name="code" />, jsx: () => <PixelIcon name="code" />,
  mjs: () => <PixelIcon name="code" />, cjs: () => <PixelIcon name="code" />, mts: () => <PixelIcon name="code" />, cts: () => <PixelIcon name="code" />,
  css: () => <PixelIcon name="code" />, scss: () => <PixelIcon name="code" />, less: () => <PixelIcon name="code" />,
  html: () => <PixelIcon name="file" />, htm: () => <PixelIcon name="file" />,
  json: () => <PixelIcon name="file" />, yaml: () => <PixelIcon name="file" />, yml: () => <PixelIcon name="file" />, toml: () => <PixelIcon name="file" />,
  csv: () => <PixelIcon name="file-text" />, tsv: () => <PixelIcon name="file-text" />,
  sh: () => <PixelIcon name="file-text" />, bash: () => <PixelIcon name="file-text" />, zsh: () => <PixelIcon name="file-text" />,
  sql: () => <PixelIcon name="file-text" />, py: () => <PixelIcon name="code" />, go: () => <PixelIcon name="code" />, rs: () => <PixelIcon name="code" />, java: () => <PixelIcon name="code" />,
  svg: () => <PixelIcon name="image" />, png: () => <PixelIcon name="image" />, jpg: () => <PixelIcon name="image" />, jpeg: () => <PixelIcon name="image" />,
  gif: () => <PixelIcon name="image" />, webp: () => <PixelIcon name="image" />, ico: () => <PixelIcon name="image" />,
  justfile: () => <PixelIcon name="file-text" />, makefile: () => <PixelIcon name="file-text" />, unknown: () => <PixelIcon name="file" />,

  // view Sidebar GROUP_ICON
  'group:changes': () => <PixelIcon name="article" />,   // list 缺失,用 article
  'group:archive': () => <PixelIcon name="archive" />,
  'group:specs': () => <PixelIcon name="shield" />,
  'group:docs': () => <PixelIcon name="book-open" />,
  'group:other': () => <PixelIcon name="box" />,

  // design Sidebar GROUP_ICON
  'group:page': () => <PixelIcon name="monitor" />,
  'group:component': () => <PixelIcon name="grid-2x2-2" />,
  'group:icon': () => <PixelIcon name="image" />,
  'group:token': () => <PixelIcon name="inbox" />,       // palette 缺失,用 inbox(调色盘近似可选)
  'group:md': () => <PixelIcon name="book-open" />,
  'group:video': () => <PixelIcon name="video" />,
  'group:audio': () => <PixelIcon name="audio-waveform" />,
  'group:pdf': () => <PixelIcon name="file-text" />,
  'group:font': () => <PixelIcon name="text" />,          // type 缺失,用 text

  // EmptyState
  'empty:muted': () => <PixelIcon name="inbox" />,
  'empty:primary': () => <PixelIcon name="article" />,

  // IconRail
  'rail:home': () => <PixelIcon name="home" />,
};

// ---------------------------------------------------------------------------
// pixelarticons name 映射（按 key 指定具体图标名）
// ---------------------------------------------------------------------------

const PIXEL_ICON_NAMES: Record<IconKey, string> = {
  // FileIcon
  md: 'FileText', markdown: 'FileText', mdx: 'FileText',
  ts: 'Code', tsx: 'Code', js: 'Code', jsx: 'Code',
  mjs: 'Code', cjs: 'Code', mts: 'Code', cts: 'Code',
  css: 'Code', scss: 'Code', less: 'Code',
  html: 'Globe', htm: 'Globe',
  json: 'Brackets', yaml: 'Brackets', yml: 'Brackets', toml: 'Brackets',
  csv: 'FileText', tsv: 'FileText',
  sh: 'Terminal', bash: 'Terminal', zsh: 'Terminal',
  sql: 'Terminal', py: 'Code', go: 'Code', rs: 'Code', java: 'Code',
  svg: 'Image', png: 'Image', jpg: 'Image', jpeg: 'Image',
  gif: 'Image', webp: 'Image', ico: 'Image',
  justfile: 'Terminal', makefile: 'Terminal', unknown: 'File',

  // view Sidebar GROUP_ICON
  'group:changes': 'ListBox',
  'group:archive': 'Box',
  'group:specs': 'Shield',
  'group:docs': 'BookOpen',
  'group:other': 'Package',

  // design Sidebar GROUP_ICON
  'group:page': 'Monitor',
  'group:component': 'Blocks',
  'group:icon': 'Shapes',
  'group:token': 'ColorsSwatch',
  'group:md': 'BookOpen',
  'group:video': 'Video',
  'group:audio': 'AudioWaveform',
  'group:pdf': 'FileText',
  'group:font': 'TextColums',

  // EmptyState
  'empty:muted': 'Inbox',
  'empty:primary': 'Sparkles',

  // IconRail
  'rail:home': 'Home',
};

// ---------------------------------------------------------------------------
// Theme hook
// ---------------------------------------------------------------------------

function themeSubscribe(cb: () => void) {
  const el = document.documentElement;
  el.addEventListener('themechange', cb);
  return () => el.removeEventListener('themechange', cb);
}

function themeGetSnapshot() {
  return document.documentElement.dataset.theme ?? 'default';
}

function themeGetServerSnapshot() {
  return 'default';
}

export function useTheme() {
  return useSyncExternalStore(themeSubscribe, themeGetSnapshot, themeGetServerSnapshot);
}

// ---------------------------------------------------------------------------
// useIcons hook
// ---------------------------------------------------------------------------

export function useIcons() {
  const theme = useTheme();
  const set = ICON_SETS[theme as keyof typeof ICON_SETS] ?? ICON_SETS.default;
  return {
    icon: (key: IconKey) => set[key] ?? defaultSet[key] ?? lucide.FileText,
  };
}

// ---------------------------------------------------------------------------
// 导出：供非 hook 上下文使用
// ---------------------------------------------------------------------------

export const ICON_SETS = {
  default: defaultSet,
  pixel: pixelSet,
} as const;
