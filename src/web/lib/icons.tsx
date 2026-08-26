/**
 * Icon registry: 当前主题图标集。
 *
 * 设计边界：按钮/链接等内联装饰图标（如 <Play />、<Square />）不纳入，
 * 仅覆盖集中映射点：FileIcon、两侧栏 GROUP_ICON、EmptyState、IconRail 首页。
 */

import * as lucide from 'lucide-react';
import * as pixelReact from 'pixelarticons/react/index.js';
import {
  GitBranch, FolderOpen, Play, Square, Eraser,
  Check, Palette, Moon, Sun,
  FileText, Code, Globe, Terminal, Image,
  ShieldCheck, BookOpen, Package,
  Monitor, Shapes, Video,
} from '@phosphor-icons/react';
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

// 通用图标（按钮/操作类）
type GenericKey =
  | 'git-branch' | 'folder-open' | 'folder' | 'play' | 'square'
  | 'rotate-cw' | 'eraser' | 'check' | 'palette'
  | 'moon' | 'sun' | 'package-open' | 'power'
  | 'monitor'
  | 'folder-git-2' | 'tablet' | 'smartphone' | 'sliders-horizontal' | 'image-off'
  | 'bug' | 'external-link' | 'refresh-cw'
  | 'clipboard-check' | 'chevron-down' | 'chevron-up' | 'rotate-ccw' | 'send' | 'x'
  | 'bar-chart-3' | 'folder-tree' | 'git-pull-request'
  | 'chevron-left' | 'file-question'
  | 'chevron-right' | 'blocks' | 'type' | 'eye'
  | 'file-text' | 'settings';

export type IconKey = FileExt | ViewGroup | DesignGroup | EmptyStateKey | RailKey | GenericKey;

// ---------------------------------------------------------------------------
// 语义映射（只定义一次）
// ---------------------------------------------------------------------------

export const ICON_MAP: Record<IconKey, string> = {
  // FileIcon
  md: 'FileText', markdown: 'FileText', mdx: 'FileText',
  ts: 'Code', tsx: 'Code', js: 'Code', jsx: 'Code',
  mjs: 'Code', cjs: 'Code', mts: 'Code', cts: 'Code',
  css: 'Code', scss: 'Code', less: 'Code',
  html: 'Globe', htm: 'Globe',
  json: 'Braces', yaml: 'Braces', yml: 'Braces', toml: 'Braces',
  csv: 'FileSpreadsheet', tsv: 'FileSpreadsheet',
  sh: 'Terminal', bash: 'Terminal', zsh: 'Terminal',
  sql: 'Terminal', py: 'Code', go: 'Code', rs: 'Code', java: 'Code',
  svg: 'Image', png: 'Image', jpg: 'Image', jpeg: 'Image',
  gif: 'Image', webp: 'Image', ico: 'Image',
  justfile: 'Terminal', makefile: 'Terminal', unknown: 'FileText',

  // view Sidebar GROUP_ICON
  'group:changes': 'ListTodo',
  'group:archive': 'Boxes',
  'group:specs': 'ShieldCheck',
  'group:docs': 'BookOpen',
  'group:other': 'Package',

  // design Sidebar GROUP_ICON
  'group:page': 'Monitor',
  'group:component': 'Blocks',
  'group:icon': 'Shapes',
  'group:token': 'Palette',
  'group:md': 'BookOpen',
  'group:video': 'Video',
  'group:audio': 'AudioLines',
  'group:pdf': 'FileText',
  'group:font': 'TextColumns',

  // EmptyState
  'empty:muted': 'Inbox',
  'empty:primary': 'Sparkles',

  // IconRail
  'rail:home': 'Home',

  // 通用图标
  'git-branch': 'GitBranch',
  'folder-open': 'FolderOpen',
  'folder': 'Folder',
  'play': 'Play',
  'square': 'Square',
  'rotate-cw': 'RotateCw',
  'eraser': 'Eraser',
  'check': 'Check',
  'palette': 'Palette',
  'moon': 'Moon',
  'sun': 'Sun',
  'package-open': 'PackageOpen',
  'power': 'Power',
  'monitor': 'Monitor',
  'folder-git-2': 'FolderGit2',
  'tablet': 'Tablet',
  'smartphone': 'Smartphone',
  'sliders-horizontal': 'SlidersHorizontal',
  'image-off': 'ImageOff',
  'bug': 'Bug',
  'external-link': 'ExternalLink',
  'refresh-cw': 'RefreshCw',
  'clipboard-check': 'ClipboardCheck',
  'chevron-down': 'ChevronDown',
  'chevron-up': 'ChevronUp',
  'rotate-ccw': 'RotateCcw',
  'send': 'Send',
  'x': 'X',
  'bar-chart-3': 'BarChart3',
  'folder-tree': 'FolderTree',
  'git-pull-request': 'GitPullRequest',
  'chevron-left': 'ChevronLeft',
  'file-question': 'FileQuestion',
  'chevron-right': 'ChevronRight',
  'blocks': 'Blocks',
  'type': 'Type',
  'eye': 'Eye',
  'file-text': 'FileText',
  'settings': 'Settings',
};

// ---------------------------------------------------------------------------
// 渲染器：default (lucide-react)
// ---------------------------------------------------------------------------

function defaultRenderer(name: string, className?: string): React.ReactNode {
  const Cmp = (lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Cmp) return null;
  return className ? <Cmp className={className} /> : <Cmp />;
}

// ---------------------------------------------------------------------------
// 渲染器：pixel (pixelarticons + lucide fallback)
// ---------------------------------------------------------------------------

function pixelRenderer(name: string, className?: string): React.ReactNode {
  const pascal = toPascal(name);
  const Cmp = (pixelReact as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascal];
  if (Cmp) return className ? <Cmp className={className} /> : <Cmp />;
  const Fallback = (lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (Fallback) return className ? <Fallback className={className} /> : <Fallback />;
  return null;
}

// ---------------------------------------------------------------------------
// 渲染器：slate (phosphor regular + lucide fallback)
// ---------------------------------------------------------------------------

const phosphorMap = {
  GitBranch, FolderOpen, Play, Square, Eraser,
  Check, Palette, Moon, Sun,
  FileText, Code, Globe, Terminal, Image,
  ShieldCheck, BookOpen, Package,
  Monitor, Shapes, Video,
} as const satisfies Record<string, React.ComponentType<{ className?: string }>>;

function slateRenderer(name: string, className?: string): React.ReactNode {
  const Cmp = phosphorMap[name as keyof typeof phosphorMap];
  if (Cmp) return className ? <Cmp className={className} weight="regular" /> : <Cmp weight="regular" />;
  const Fallback = (lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (Fallback) return className ? <Fallback className={className} /> : <Fallback />;
  return null;
}

// ---------------------------------------------------------------------------
// 主题订阅
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

const renderers = {
  default: defaultRenderer,
  pixel: pixelRenderer,
  slate: slateRenderer,
};

export function useIcons() {
  const theme = useTheme();
  const renderer = renderers[theme as keyof typeof renderers] ?? defaultRenderer;
  return {
    icon: (key: IconKey, className?: string): React.ReactNode => {
      const name = ICON_MAP[key];
      if (!name) return null;
      const node = renderer(name, className);
      if (node) return node;
      return defaultRenderer(name, className);
    },
  };
}
