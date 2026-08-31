/**
 * Icon registry: 当前主题图标集。
 *
 * 设计边界：按钮/链接等内联装饰图标（如 <Play />、<Square />）不纳入，
 * 仅覆盖集中映射点：FileIcon、两侧栏 GROUP_ICON、EmptyState、IconRail 首页。
 *
 * 体积边界：三个主题的图标一律**具名导入**进常量池（lucidePool/pixelPool/phosphorMap），
 * 渲染时按组件常量查表——禁止 `import *` 命名空间 + 字符串动态索引，
 * 否则 esbuild/rollup 无法 tree-shake，全量图标会进入 eager 主包（曾致 1.45MB）。
 * 新增图标：ICON_MAP 值 + 对应 import 池两处同步；dev 期缺漏断言兜底（见文件尾）。
 */

import {
  FileText, Code, Globe, Braces, FileSpreadsheet, Terminal, Image,
  ListTodo, Boxes, ShieldCheck, BookOpen, Package,
  Monitor, Shapes, Video, AudioLines, Inbox, Sparkles, Home,
  GitBranch, FolderOpen, Folder, Play, Square, RotateCw, Eraser,
  Check, Palette, Moon, Sun, PackageOpen, Power, FolderGit2,
  Tablet, Smartphone, SlidersHorizontal, ImageOff, Bug,
  ExternalLink, RefreshCw, ClipboardCheck, ChevronDown, ChevronUp,
  RotateCcw, Send, X, BarChart3, FolderTree, GitPullRequest,
  ChevronLeft, FileQuestion, ChevronRight, Type, Eye, Settings,
  Blocks, LetterText,
} from 'lucide-react';
import {
  FileText as PxFileText, Code as PxCode, Globe as PxGlobe, Braces as PxBraces,
  Terminal as PxTerminal, Image as PxImage, BookOpen as PxBookOpen,
  Package as PxPackage, Monitor as PxMonitor, Blocks as PxBlocks,
  Shapes as PxShapes, Video as PxVideo, Inbox as PxInbox,
  Sparkles as PxSparkles, Home as PxHome, GitBranch as PxGitBranch,
  Folder as PxFolder, Play as PxPlay,
  Square as PxSquare, Eraser as PxEraser, Check as PxCheck,
  Moon as PxMoon, Sun as PxSun, Power as PxPower, Tablet as PxTablet,
  Smartphone as PxSmartphone, SlidersHorizontal as PxSlidersHorizontal,
  Bug as PxBug, ExternalLink as PxExternalLink, ChevronDown as PxChevronDown,
  ChevronUp as PxChevronUp, Send as PxSend, X as PxX,
  GitPullRequest as PxGitPullRequest, ChevronLeft as PxChevronLeft,
  ChevronRight as PxChevronRight, Eye as PxEye,
} from 'pixelarticons/react/index.js';
import {
  GitBranch as PhGitBranch, FolderOpen as PhFolderOpen, Play as PhPlay,
  Square as PhSquare, Eraser as PhEraser, Check as PhCheck,
  Palette as PhPalette, Moon as PhMoon, Sun as PhSun,
  FileText as PhFileText, Code as PhCode, Globe as PhGlobe,
  Terminal as PhTerminal, Image as PhImage, ShieldCheck as PhShieldCheck,
  BookOpen as PhBookOpen, Package as PhPackage, Monitor as PhMonitor,
  Shapes as PhShapes, Video as PhVideo,
} from '@phosphor-icons/react';
import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// 组件常量池:键 = ICON_MAP 的值(lucide 组件名字符串),值 = 已具名导入的组件
// ---------------------------------------------------------------------------

type IconComponent = React.ComponentType<{ className?: string }>;

/** default 主题主池(同时也是 pixel/slate 的 fallback 池) */
const lucidePool = {
  FileText, Code, Globe, Braces, FileSpreadsheet, Terminal, Image,
  ListTodo, Boxes, ShieldCheck, BookOpen, Package,
  Monitor, Shapes, Video, AudioLines, Inbox, Sparkles, Home,
  GitBranch, FolderOpen, Folder, Play, Square, RotateCw, Eraser,
  Check, Palette, Moon, Sun, PackageOpen, Power, FolderGit2,
  Tablet, Smartphone, SlidersHorizontal, ImageOff, Bug,
  ExternalLink, RefreshCw, ClipboardCheck, ChevronDown, ChevronUp,
  RotateCcw, Send, X, BarChart3, FolderTree, GitPullRequest,
  ChevronLeft, FileQuestion, ChevronRight, Type, Eye, Settings,
  Blocks, LetterText,
} as const satisfies Record<string, IconComponent>;

/** pixel 主题池:仅收 pixelarticons 实际导出的交集,其余 fallback 到 lucide */
const pixelPool = {
  FileText: PxFileText, Code: PxCode, Globe: PxGlobe, Braces: PxBraces,
  Terminal: PxTerminal, Image: PxImage, BookOpen: PxBookOpen,
  Package: PxPackage, Monitor: PxMonitor, Blocks: PxBlocks,
  Shapes: PxShapes, Video: PxVideo, Inbox: PxInbox,
  Sparkles: PxSparkles, Home: PxHome, GitBranch: PxGitBranch,
  Folder: PxFolder, Play: PxPlay,
  Square: PxSquare, Eraser: PxEraser, Check: PxCheck,
  Moon: PxMoon, Sun: PxSun, Power: PxPower, Tablet: PxTablet,
  Smartphone: PxSmartphone, SlidersHorizontal: PxSlidersHorizontal,
  Bug: PxBug, ExternalLink: PxExternalLink, ChevronDown: PxChevronDown,
  ChevronUp: PxChevronUp, Send: PxSend, X: PxX,
  GitPullRequest: PxGitPullRequest, ChevronLeft: PxChevronLeft,
  ChevronRight: PxChevronRight, Eye: PxEye,
} as const satisfies Record<string, IconComponent>;

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
  | 'file-text' | 'settings' | 'terminal'
  | 'sparkles';

export type IconKey = FileExt | ViewGroup | DesignGroup | EmptyStateKey | RailKey | GenericKey;

/** 平台维护的 mode→icon 映射(manifest.icon 仅作未命中 fallback) */
export const MODE_ICON_MAP: Record<string, IconKey> = {
  stats: 'bar-chart-3',
  view: 'folder-tree',
  design: 'palette',
  just: 'terminal',
};

// ---------------------------------------------------------------------------
// 语义映射（只定义一次;值 = 池键,非组件——渲染经池查表）
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
  // 原 'TextColumns' 在 lucide-react 无此导出(曾渲染为 null),改为 LetterText
  'group:font': 'LetterText',

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
  'terminal': 'Terminal',
  'sparkles': 'Sparkles',
};

// ---------------------------------------------------------------------------
// 渲染器(共享 import 池,动态索引消失)
// ---------------------------------------------------------------------------

function renderFromPool(Cmp: IconComponent | undefined, className?: string): React.ReactNode {
  if (!Cmp) return null;
  return className ? <Cmp className={className} /> : <Cmp />;
}

/** default (lucide) */
function defaultRenderer(name: string, className?: string): React.ReactNode {
  return renderFromPool(lucidePool[name as keyof typeof lucidePool], className);
}

/** pixel (pixelarticons + lucide fallback) */
function pixelRenderer(name: string, className?: string): React.ReactNode {
  return renderFromPool(pixelPool[name as keyof typeof pixelPool] ?? lucidePool[name as keyof typeof lucidePool], className);
}

/** slate (phosphor regular + lucide fallback) */
const phosphorMap = {
  GitBranch: PhGitBranch, FolderOpen: PhFolderOpen, Play: PhPlay,
  Square: PhSquare, Eraser: PhEraser, Check: PhCheck,
  Palette: PhPalette, Moon: PhMoon, Sun: PhSun,
  FileText: PhFileText, Code: PhCode, Globe: PhGlobe,
  Terminal: PhTerminal, Image: PhImage, ShieldCheck: PhShieldCheck,
  BookOpen: PhBookOpen, Package: PhPackage, Monitor: PhMonitor,
  Shapes: PhShapes, Video: PhVideo,
} as const satisfies Record<string, IconComponent>;

function slateRenderer(name: string, className?: string): React.ReactNode {
  const Cmp = phosphorMap[name as keyof typeof phosphorMap];
  if (Cmp) return className ? <Cmp className={className} weight="regular" /> : <Cmp weight="regular" />;
  return renderFromPool(lucidePool[name as keyof typeof lucidePool], className);
}

// ---------------------------------------------------------------------------
// dev 期缺漏断言:ICON_MAP 每个值必须命中 import 池,缺失渲染为空
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV !== 'production') {
  for (const [key, name] of Object.entries(ICON_MAP)) {
    if (!(name in lucidePool)) {
      console.error(`[icons] ICON_MAP["${key}"] → "${name}" 不在导入池中,该图标将渲染为空;请在 lucidePool 补具名导入`);
    }
  }
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

/** mode→图标主题节点;未注册映射返回 null(调用方以 manifest.icon 字面值兜底) */
export function useModeIcon(mode: string, className = 'h-4 w-4'): React.ReactNode {
  const { icon } = useIcons();
  const key = MODE_ICON_MAP[mode];
  if (!key) return null;
  return icon(key, className);
}
