import type { DashboardPlugin } from '../../server/plugins.js';

const plugin: DashboardPlugin = {
  mode: 'apply',
  label: '执行进度',
  icon: '⚙️',
  viewer: async () => {
    const mod = await import('./Viewer.js');
    return { default: mod.default };
  },
};

export default plugin;
