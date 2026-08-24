import type { Context } from 'cordis';

export const apply = {
  inject: ['dashboard'] as const,
  apply(ctx: Context) {
    ctx.dashboard.register({
      mode: 'view',
      label: '项目浏览',
      icon: '👁️',
      description: 'openspec / docs / 文档预览',
      config: {
        hiddenDirs: { type: 'string[]', label: '隐藏目录', default: ['.git', 'node_modules', 'dist', 'build'] },
        defaultExpandDepth: { type: 'number', label: '默认展开深度', default: 2 },
        showHidden: { type: 'boolean', label: '显示隐藏文件', default: false },
      },
    });
  },
};
