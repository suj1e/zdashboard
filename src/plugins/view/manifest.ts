/** view 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  description: 'openspec / docs / 文档预览',
  order: 20,
};

/** wt:worktree 绝对路径;file:文件相对路径;filter:树过滤词 */
export const params: ParamSchema = [
  { name: 'wt', label: 'Worktree 路径', type: 'string', description: 'worktree 绝对路径' },
  { name: 'file', label: '文件路径', type: 'string', description: '预览文件相对路径' },
  { name: 'filter', label: '过滤词', type: 'string', description: '文件树过滤词' },
];
