/** design 资产查看器:页面 iframe 预览(独立文件,自 foundation Workspace 拆出) */
import { useViewerFreshness, RefreshButton } from '../../../web/viewers/freshness.js';

export default function PageViewer({ path }: { path: string }) {
  // files SSE(300ms 防抖)/手动刷新命中当前资产时,仅给 src 追加时间戳参数强制重载(不做 key 重挂)
  const [v, refresh] = useViewerFreshness();
  const src = '/__design/asset?path=' + encodeURIComponent(path) + (v ? '&v=' + v : '');
  return (
    <div className="relative h-full">
      <div className="absolute right-3 top-3 z-10">
        <RefreshButton onClick={refresh} />
      </div>
      <iframe src={src} title="预览" className="w-full h-full border-0 bg-white" />
    </div>
  );
}
