import type { DashboardPlugin } from '../../server/plugins.js';

const plugin: DashboardPlugin = {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  viewer: async () => {
    const mod = await import('./ViewViewer.js');
    return { default: mod.ViewViewer };
  },
};

export default plugin;
