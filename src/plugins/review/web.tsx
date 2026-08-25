import { lazy } from 'react';
import ReviewWorkspace from './Workspace.js';

const plugin = {
  mode: 'review',
  label: '文档评审',
  icon: '✅',
  description: '多文档需求评审与拆解 · zreview',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
