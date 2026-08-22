import { lazy } from 'react';

const plugin = {
  mode: 'stats',
  label: '项目统计',
  icon: '📊',
  description: '项目文件统计 · 扫描生成',
  Workspace: lazy(() => import('./Workspace.js')),
} as const;

export default plugin;
