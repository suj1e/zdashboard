/// <reference types="vite/client" />
import React from 'react';
import { ExternalWorkspace } from '../components/ExternalWorkspace';
import { PlaceholderWorkspace } from '../components/PlaceholderWorkspace';
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

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
  /** true = 旧 web.tsx 形状(兼容分支),plugin-platform-plugins 迁移后删除 */
  legacy: boolean;
  Workspace: React.ComponentType<{ navTarget?: unknown }> | React.LazyExoticComponent<React.ComponentType<{ navTarget?: unknown }>>;
  Sidebar?: React.LazyExoticComponent<React.ComponentType<{ navTarget?: unknown }>>;
}

type WebLoader = () => Promise<unknown>;

/**
 * 归一化单条 web 入口导出:
 * - 新 SDK PlatformWebPlugin({ manifest, workspace, sidebar?, params? }) → 扁平 WebPlugin
 * - 旧 default export WebPlugin(mode/label/icon/Workspace)→ 兼容分支原样通过(legacy=true)
 * 不合法导出返回 null,由注册表跳过。
 */
export function normalizeWebExport(input: unknown): WebPlugin | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  // 新 SDK 形状:manifest + workspace(lazy)
  if (raw.manifest && typeof raw.manifest === 'object' && typeof raw.workspace === 'function') {
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
      legacy: false,
      Workspace: raw.workspace as WebPlugin['Workspace'],
      Sidebar: raw.sidebar as WebPlugin['Sidebar'],
    };
  }

  // 旧形状兼容分支:六内置插件迁移(plugin-platform-plugins)前继续可用
  if (typeof raw.mode === 'string' && typeof raw.Workspace === 'function') {
    return {
      mode: raw.mode,
      label: typeof raw.label === 'string' ? raw.label : raw.mode,
      icon: typeof raw.icon === 'string' ? raw.icon : '',
      description: typeof raw.description === 'string' ? raw.description : undefined,
      external: !!raw.external,
      order: typeof raw.order === 'number' ? raw.order : undefined,
      params: (raw.params ?? undefined) as ParamSchema | undefined,
      legacy: true,
      Workspace: raw.Workspace as WebPlugin['Workspace'],
      Sidebar: raw.Sidebar as WebPlugin['Sidebar'],
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

/** 收集 import.meta.glob 装载器,失败模块跳过不阻塞其余插件 */
export async function collectPlugins(entries: Iterable<[string, WebLoader]>): Promise<WebPlugin[]> {
  const loaded: WebPlugin[] = [];
  for (const [path, loader] of entries) {
    try {
      const mod = await loader();
      const p = normalizeWebExport((mod as { default?: unknown } | null | undefined)?.default);
      if (p) loaded.push(p);
    } catch (e) {
      console.error(`[zdashboard] failed to load web plugin (${path}):`, e);
    }
  }
  return loaded.sort(comparePlugins);
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
          const mapped = (data.plugins ?? []).map((p: any) => {
            if (p.viewerUrl) {
              const Wrapper = () => React.createElement(ExternalWorkspace, { viewerUrl: p.viewerUrl, label: p.label });
              return { ...p, Workspace: Wrapper, legacy: true } as WebPlugin;
            }
            const Placeholder = () => React.createElement(PlaceholderWorkspace, { label: p.label });
            return { ...p, Workspace: Placeholder, legacy: true } as WebPlugin;
          });
          setExternal(mapped.filter((p: WebPlugin) => !plugins.some((b) => b.mode === p.mode)));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [plugins]);

  return [...plugins, ...external].filter((p, i, arr) => arr.findIndex(q => q.mode === p.mode) === i);
}
