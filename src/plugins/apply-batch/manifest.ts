/** apply-batch 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'apply-batch',
  label: '批量执行',
  icon: '⚡',
  description: 'zapply 批量并行执行驾驶舱',
  order: 60,
};

/** view:graph/approval/checkpoint;sel:选中 change 名 */
export const params: ParamSchema = [
  { name: 'view', label: '视图', type: 'string', description: 'graph/approval/checkpoint' },
  { name: 'sel', label: '选中 change', type: 'string', description: '选中的 change 名' },
];
