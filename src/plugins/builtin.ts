/**
 * 内置插件 root 注入壳(插件侧适配,不动 SDK 公共契约):
 *
 * SDK definePlugin 的 apply(ctx) 不向 setup 转发 cordis 插件 config,
 * 而六个内置插件都需要 cli 注入的 { root }。此壳在插件层捕获 config.root
 * 再调用 SDK 产出的 apply,setup 以第二参拿到 root。
 * 若 SDK 未来转发 config,此文件可整体删除。
 */
import type { Context } from 'cordis';
import { definePlugin, type PluginContext } from '../sdk/server.js';
import type { PluginManifest } from '../core/manifest.js';

export function defineBuiltin(def: {
  manifest: PluginManifest;
  setup(ctx: PluginContext, root: string): void;
}) {
  let currentRoot = '';
  const inner = definePlugin({
    manifest: def.manifest,
    setup(pctx) { def.setup(pctx, currentRoot); },
  });

  return {
    inject: inner.inject,
    manifest: def.manifest, // cli 启动期死键剥离按 manifest 判定(config 声明/external)
    apply(ctx: Context, config: { root?: string }) {
      currentRoot = config?.root ?? '';
      inner.apply(ctx, config);
    },
  };
}
