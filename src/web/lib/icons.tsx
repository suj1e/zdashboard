/**
 * Icon registry: 当前主题图标集。
 *
 * 设计边界：按钮/链接等内联装饰图标（如 <Play />、<Square />）不纳入，
 * 仅覆盖集中映射点：FileIcon、两侧栏 GROUP_ICON、EmptyState、IconRail 首页。
 */

import type { SVGProps } from 'react';
import * as lucide from 'lucide-react';
import { getIconSvg } from 'pixelarticons';
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// pixelarticons 适配层：将其“无组件导出”的 SVG 包包装为 LucideIcon 兼容组件
// ---------------------------------------------------------------------------

function PixelSvg({ name, ...props }: SVGProps<HTMLSpanElement> & { name: string }) {
  const svg = getIconSvg(name);
  if (!svg) return null;
  return (
    <span
      {...props}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...props.style }}
    />
  );
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

type IconComponent = lucide.LucideIcon | typeof PixelSvg;

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
  // FileIcon — pixelarticons 文件类
  md: PixelSvg, markdown: PixelSvg, mdx: PixelSvg,
  ts: PixelSvg, tsx: PixelSvg, js: PixelSvg, jsx: PixelSvg,
  mjs: PixelSvg, cjs: PixelSvg, mts: PixelSvg, cts: PixelSvg,
  css: PixelSvg, scss: PixelSvg, less: PixelSvg,
  html: PixelSvg, htm: PixelSvg,
  json: PixelSvg, yaml: PixelSvg, yml: PixelSvg, toml: PixelSvg,
  csv: PixelSvg, tsv: PixelSvg,
  sh: PixelSvg, bash: PixelSvg, zsh: PixelSvg,
  sql: PixelSvg, py: PixelSvg, go: PixelSvg, rs: PixelSvg, java: PixelSvg,
  svg: PixelSvg, png: PixelSvg, jpg: PixelSvg, jpeg: PixelSvg,
  gif: PixelSvg, webp: PixelSvg, ico: PixelSvg,
  justfile: PixelSvg, makefile: PixelSvg, unknown: PixelSvg,

  // view Sidebar GROUP_ICON
  'group:changes': PixelSvg,
  'group:archive': PixelSvg,
  'group:specs': PixelSvg,
  'group:docs': PixelSvg,
  'group:other': PixelSvg,

  // design Sidebar GROUP_ICON
  'group:page': PixelSvg,
  'group:component': PixelSvg,
  'group:icon': PixelSvg,
  'group:token': PixelSvg,
  'group:md': PixelSvg,
  'group:video': PixelSvg,
  'group:audio': PixelSvg,
  'group:pdf': PixelSvg,
  'group:font': PixelSvg,

  // EmptyState
  'empty:muted': PixelSvg,
  'empty:primary': PixelSvg,

  // IconRail
  'rail:home': PixelSvg,
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
    icon: (key: IconKey) => {
      const Comp = set[key];
      if (!Comp) return defaultSet[key] ?? lucide.FileText;
      if (Comp === PixelSvg) {
        const name = PIXEL_ICON_NAMES[key];
        return (props: SVGProps<HTMLSpanElement>) => <PixelSvg {...props} name={name} />;
      }
      return Comp;
    },
  };
}

// ---------------------------------------------------------------------------
// 导出：供非 hook 上下文使用
// ---------------------------------------------------------------------------

export const ICON_SETS = {
  default: defaultSet,
  pixel: pixelSet,
} as const;
