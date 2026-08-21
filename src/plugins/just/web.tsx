import { lazy } from 'react';
import JustWorkspace from './Workspace.js';

const plugin = {
  mode: 'just',
  label: 'Just Runner',
  icon: '📜',
  description: 'Just 任务日志与执行',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { JustWorkspace };
