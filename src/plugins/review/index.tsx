import type { DashboardPlugin } from '../../server/plugins.js';

function ReviewViewer() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <p className="text-lg mb-2">✅ 文档评审模式</p>
        <p className="text-sm">review.yaml 逐项对齐</p>
        <p className="text-xs mt-2 text-muted-foreground/70">（占位，后续接入完整 viewer）</p>
      </div>
    </div>
  );
}

const plugin: DashboardPlugin = {
  mode: 'review',
  label: '文档评审',
  icon: '✅',
  viewer: async () => ({ default: ReviewViewer }),
};

export default plugin;
