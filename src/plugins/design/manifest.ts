/** design 插件单源:server definePlugin 与 web defineWebPlugin 共享 */
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

export const manifest: PluginManifest = {
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  description: '设计资产分类浏览 · zdesign',
  order: 30,
  config: {
    folders: { type: 'string[]', label: '扫描文件夹', default: [] },
  },
};

/** type:资产类型;asset:选中资产路径;folder:当前文件夹(扫描范围) */
export const params: ParamSchema = [
  { name: 'type', label: '资产类型', type: 'string', description: 'page/component/icon/token/md/video/audio/pdf/font' },
  { name: 'asset', label: '选中资产', type: 'string', description: '资产相对路径' },
  { name: 'folder', label: '当前文件夹', type: 'string', description: '限定展示的扫描文件夹' },
];
