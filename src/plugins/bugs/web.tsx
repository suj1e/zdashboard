import { lazy } from 'react';
import BugWorkspace from './Workspace.js';
import BugSidebar from './Sidebar.js';

const plugin = {
  mode: 'bugs',
  label: '禅道 Bugs',
  icon: '🎯',
  description: '只读 bug 列表',
  Sidebar: lazy(() => import('./Sidebar.js')),
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { BugWorkspace, BugSidebar };
