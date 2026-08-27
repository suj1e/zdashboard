/** stats 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'stats',
  label: '项目统计',
  icon: '📊',
  description: '项目文件统计 · 扫描生成',
  order: 10,
};

/** card:钻取来源(worktree/dirty),view 侧读取后高亮 */
export const params: ParamSchema = [
  { name: 'card', label: '钻取来源', type: 'string', description: '钻取来源(worktree/dirty),view 侧读取后高亮' },
];
