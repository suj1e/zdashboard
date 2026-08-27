/// <reference types="vite/client" />
import React from 'react';
import { ExternalWorkspace } from '../components/ExternalWorkspace';
import { PlaceholderWorkspace } from '../components/PlaceholderWorkspace';
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

/**
 * 宿主渲染插件工作区/侧栏时可注入的统一 props:
 * params 为当前页 URL search params(含 p),宿主从 route 注入。
 */
export interface WorkspaceHostProps {
  params?: URLSearchParams;
}

export interface WebPlugin {
  mode: string;
  label: string;
  icon: string;
  description?: string;
  external?: boolean;
  /** 排序权重(小在前);来自 manifest.order,缺省按字母序 */
  order?: number;
  manifest?: PluginManifest;
  params?: ParamSchema;
  Workspace: React.ComponentType<WorkspaceHostProps> | React.LazyExoticComponent<React.ComponentType<WorkspaceHostProps>>;
  Sidebar?: React.LazyExoticComponent<React.ComponentType<WorkspaceHostProps>>;
}

type WebLoader = () => Promise<unknown>;

/** React 组件判定:lazy()/forwardRef 是带 $$typeof 的对象,函数组件才是 function */
function isReactComponentish(v: unknown): boolean {
  if (typeof v === 'function') return true;
  return !!v && typeof v === 'object' && '$$typeof' in (v as object);
}

/**
 * 归一化单条 web 入口导出(SDK defineWebPlugin:{ manifest, workspace, sidebar?, params? })。
 * 旧 default export 形状已随 plugin-platform-plugins T7 删除;不合法导出返回 null 由注册表跳过。
 */
export function normalizeWebExport(input: unknown): WebPlugin | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  if (raw.manifest && typeof raw.manifest === 'object' && isReactComponentish(raw.workspace)) {
    const m = raw.manifest as PluginManifest;
    if (!m.mode) return null;
    return {
      mode: m.mode,
      label: m.label,
      icon: m.icon,
      description: m.description,
      external: m.external,
      order: m.order,
      manifest: m,
      params: (raw.params ?? undefined) as ParamSchema | undefined,
      Workspace: raw.workspace as WebPlugin['Workspace'],
      Sidebar: raw.sidebar as WebPlugin['Sidebar'],
    };
  }

  return null;
}

/** order 升序;缺省者排尾并按字母序;同 order 字母序 */
export function comparePlugins(a: Pick<WebPlugin, 'mode' | 'order'>, b: Pick<WebPlugin, 'mode' | 'order'>): number {
  const oa = a.order ?? null;
  const ob = b.order ?? null;
  if (oa !== null && ob !== null) return oa !== ob ? oa - ob : a.mode.localeCompare(b.mode);
  if (oa !== null) return -1;
  if (ob !== null) return 1;
  return a.mode.localeCompare(b.mode);
}

/** 收集 import.meta.glob 装载器(并行加载),失败模块跳过不阻塞其余插件 */
export async function collectPlugins(entries: Iterable<[string, WebLoader]>): Promise<WebPlugin[]> {
  const loaded = await Promise.all(
    Array.from(entries, async ([path, loader]) => {
      try {
        const mod = await loader();
        return normalizeWebExport((mod as { default?: unknown } | null | undefined)?.default);
      } catch (e) {
        console.error(`[zdashboard] failed to load web plugin (${path}):`, e);
        return null;
      }
    }),
  );
  return (loaded.filter((p): p is WebPlugin => p !== null)).sort(comparePlugins);
}

export function usePlugins() {
  const [plugins, setPlugins] = React.useState<WebPlugin[]>([]);
  const [external, setExternal] = React.useState<WebPlugin[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const modules = import.meta.glob('../../plugins/*/web.tsx');
      const list = await collectPlugins(Object.entries(modules));
      if (!cancelled) setPlugins(list);
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/__plugins', { cache: 'no-store' });
        const data = await r.json();
        if (!cancelled) {
          // 外部插件工作区统一壳:有 viewerUrl 走 iframe(桥接线),缺省落占位页
          const mapped = (data.plugins ?? []).map((p: PluginManifest) => {
            const viewerUrl = p.viewerUrl ?? '';
            const Workspace = viewerUrl
              ? (props: WorkspaceHostProps) => React.createElement(ExternalWorkspace, { viewerUrl, label: p.label, mode: p.mode, params: props.params })
              : () => React.createElement(PlaceholderWorkspace, { label: p.label });
            return { ...p, Workspace } as WebPlugin;
          });
          setExternal(mapped.filter((p: WebPlugin) => !plugins.some((b) => b.mode === p.mode)));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [plugins]);

  return [...plugins, ...external].filter((p, i, arr) => arr.findIndex(q => q.mode === p.mode) === i);
}
