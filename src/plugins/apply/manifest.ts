/** apply 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'apply',
  label: '执行进度',
  icon: '⚙️',
  description: 'OpenSpec 执行进度 · zapply 单 change 与批量',
  order: 40,
};

/** change:单 change 视图选中的 change 名;view:single/batch Tab;sel:批量视图选中 change 名;
 *  run:批量驾驶舱显式 runId(多战线寻址,缺省读 CURRENT) */
export const params: ParamSchema = [
  { name: 'change', label: 'Change', type: 'string', description: 'openspec change 名' },
  { name: 'view', label: '视图', type: 'string', description: 'single/batch(缺省 single)' },
  { name: 'sel', label: '选中 change', type: 'string', description: '批量驾驶舱选中的 change 名' },
  { name: 'run', label: 'Run ID', type: 'string', description: '显式 runId(多战线时寻址),缺省读 CURRENT' },
];
