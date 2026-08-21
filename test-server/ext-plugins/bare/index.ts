import type { Context } from 'cordis';

export default {
  inject: ['dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    ctx.inject(['dashboard'], () => {
      const dashboard = (ctx as any).dashboard;
      if (!dashboard?.register) return;
      dashboard.register({
        mode: 'bare',
        label: '占位插件',
        icon: '📦',
        description: '无 web 目录的外部插件，验证占位页',
      });
    });
  },
};
