import { lazy } from 'react';
import ApplyWorkspace from './Workspace.js';

const plugin = {
  mode: 'apply',
  label: '执行进度',
  icon: '⚙️',
  description: 'OpenSpec change 执行进度 · zapply',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { ApplyWorkspace };
