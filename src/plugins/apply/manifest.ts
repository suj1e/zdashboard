/** apply 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'apply',
  label: '执行进度',
  icon: '⚙️',
  description: 'OpenSpec change 执行进度 · zapply',
  order: 40,
};

/** change:选中的 change 名 */
export const params: ParamSchema = [
  { name: 'change', label: 'Change', type: 'string', description: 'openspec change 名' },
];
