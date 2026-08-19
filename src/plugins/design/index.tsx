import type { DashboardPlugin } from '../../server/plugins.js';

const plugin: DashboardPlugin = {
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  viewer: async () => {
    const mod = await import('./viewers/DesignViewer.js');
    return { default: mod.default };
  },
};

export default plugin;
