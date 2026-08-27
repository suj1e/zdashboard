/**
 * 插件 SDK(client 侧):defineWebPlugin 是 web 入口的唯一姿势。
 *
 * workspace 强制 React.lazy —— 类型层面拒绝静态 import 组件,
 * 保证六插件按 mode 独立分包(假 lazy 写法由此消亡)。
 */
import type React from 'react';
import type { PluginManifest } from '../core/manifest.js';
import type { ParamSchema } from './shared.js';

export interface PluginWorkspaceProps {
  /** 当前页 URL params(?p=<mode> 之后的部分),由 router 注入 */
  params: URLSearchParams;
}

export interface PlatformWebPlugin {
  manifest: PluginManifest;
  workspace: React.LazyExoticComponent<React.ComponentType<PluginWorkspaceProps>>;
  sidebar?: React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;
  params?: ParamSchema;
}

/**
 * 定义插件的 web 侧入口。
 * @param def.manifest 与 server definePlugin import 的同一份常量(SSOT)
 * @param def.workspace 必须为 lazy(() => import(...)),否则类型不通过
 */
export function defineWebPlugin(def: {
  manifest: PluginManifest;
  workspace: React.LazyExoticComponent<React.ComponentType<PluginWorkspaceProps>>;
  sidebar?: React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;
  params?: ParamSchema;
}): PlatformWebPlugin {
  return { manifest: def.manifest, workspace: def.workspace, sidebar: def.sidebar, params: def.params };
}
