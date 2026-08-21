import type { Context } from 'cordis';

export const apply = {
  inject: ['dashboard'] as const,
  apply(ctx: Context) {
    ctx.dashboard.register({ mode: 'view', label: '项目浏览', icon: '👁️', description: 'openspec / docs / 文档预览' });
  },
};
