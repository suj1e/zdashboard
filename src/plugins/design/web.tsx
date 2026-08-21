import { lazy } from 'react';
import DesignWorkspace from './Workspace.js';

const plugin = {
  mode: 'design',
  label: '设计资产',
  icon: '🎨',
  description: '设计资产分类浏览 · zdesign',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { DesignWorkspace };
