import type { DashboardPlugin } from '../../server/plugins.js';

const plugin: DashboardPlugin = {
  mode: 'bugs',
  label: '禅道 Bugs',
  icon: '🎯',
  viewer: async () => {
    const mod = await import('./Viewer.js');
    return { default: mod.default };
  },
};

export default plugin;
