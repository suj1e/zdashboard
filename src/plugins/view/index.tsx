import type { DashboardPlugin } from '../../server/plugins.js';

function ViewViewer() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <p className="text-lg mb-2">📁 项目浏览模式</p>
        <p className="text-sm">FileTree + Markdown/Image 查看器</p>
        <p className="text-xs mt-2 text-muted-foreground/70">（占位，后续接入完整 viewer）</p>
      </div>
    </div>
  );
}

const plugin: DashboardPlugin = {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  viewer: async () => ({ default: ViewViewer }),
};

export default plugin;
