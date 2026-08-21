import { lazy } from 'react';
import BugWorkspace from './Workspace.js';

const plugin = {
  mode: 'bugs',
  label: '禅道 Bugs',
  icon: '🎯',
  description: '只读 bug 列表 · zgoal',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { BugWorkspace };
