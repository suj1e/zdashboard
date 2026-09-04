/** design 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  description: '设计目录浏览 · prototypes/design',
  order: 30,
};

/** asset:选中资产路径(根相对, prototypes/ 或 design/ 下) */
export const params: ParamSchema = [
  { name: 'asset', label: '选中资产', type: 'string', description: '资产根相对路径' },
];
