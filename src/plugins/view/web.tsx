import { lazy } from 'react';
import ViewWorkspace from './Workspace.js';

const plugin = {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  description: 'openspec / docs / 文档预览',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
export { ViewWorkspace };
