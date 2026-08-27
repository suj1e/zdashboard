import { lazy } from 'react';
import ApplyBatchWorkspace from './Workspace.js';

const plugin = {
  mode: 'apply-batch',
  label: '批量执行',
  icon: '⚡',
  description: 'zapply 批量并行执行驾驶舱',
  order: 60,
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { ApplyBatchWorkspace };
