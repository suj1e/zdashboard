import { lazy } from 'react';
import ReviewWorkspace from './Workspace.js';

const plugin = {
  mode: 'review',
  label: '文档评审',
  icon: '✅',
  description: '评审项状态流转 · zreview',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { ReviewWorkspace };
