/** just 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'just',
  label: 'Just Runner',
  icon: '📜',
  description: 'Just 任务日志与执行',
  order: 50,
};

/** recipe:选中 recipe;task:活跃任务 id(与 recipe 同名空间,为多任务侧栏预留) */
export const params: ParamSchema = [
  { name: 'recipe', label: 'Recipe', type: 'string', description: '选中的 recipe 名' },
  { name: 'task', label: '活跃任务', type: 'string', description: '活跃任务 id' },
];
