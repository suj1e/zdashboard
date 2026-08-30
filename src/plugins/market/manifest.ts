/** market 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'market',
  label: '灵感市场',
  icon: '✨',
  description: 'Logo / 动效 / 设计灵感浏览 · 转提示词闭环',
  order: 40,
};

/** tab:当前市场;entry:选中目录项(深链接);q:搜索词 */
export const params: ParamSchema = [
  { name: 'tab', label: '当前市场', type: 'string', description: 'logos/motions/inspirations' },
  { name: 'q', label: '搜索词', type: 'string', description: '当前市场内搜索/过滤' },
  { name: 'entry', label: '选中条目', type: 'string', description: '目录项 id,直达详情' },
];
