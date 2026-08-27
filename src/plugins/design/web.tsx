import { lazy } from 'react';
import DesignWorkspace from './Workspace.js';
import DesignSidebar from './Sidebar.js';

const plugin = {
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  description: '设计资产分类浏览 · zdesign',
  order: 30,
  Sidebar: lazy(() => import('./Sidebar.js')),
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { DesignWorkspace, DesignSidebar };
