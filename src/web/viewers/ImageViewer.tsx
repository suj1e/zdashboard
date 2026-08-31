import { useEffect, useState } from 'react';
import { ErrorState } from '../kit/index.js';
import { useViewerFreshness, RefreshButton } from './freshness.js';

/** resolve:可选整 URL 解析器(不传 = 根路径直取,view 插件语义);design 插件传代理路由解析 */
export function ImageViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const [dim, setDim] = useState('-');
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  // files SSE(300ms 防抖)/手动刷新统一走失效版本号:src 追加 v 参数强制重载(不做 key 重挂)
  const [version, refresh] = useViewerFreshness();
  // 切图重置瞬态:A 图失败/尺寸标注不残留到 B 图
  useEffect(() => { setErr(false); setDim('-'); }, [path]);
  const name = path.split('/').pop();
  const base = resolve ? resolve(path) : '/' + encodeURI(path);
  // base 可能带(design 代理 ?path=)也可能不带(view 根直取)查询串
  const src = version ? `${base}${base.includes('?') ? '&' : '?'}v=${version}` : base;
  const chess: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(45deg,hsl(var(--border)) 25%,transparent 25%),linear-gradient(-45deg,hsl(var(--border)) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,hsl(var(--border)) 75%),linear-gradient(-45deg,transparent 75%,hsl(var(--border)) 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-4 py-2 border-b text-xs flex items-center gap-3">
        <span className="font-mono text-foreground">{name}</span>
        <span className="text-muted-foreground">{dim}</span>
        <div className="ml-auto flex items-center gap-1">
          <RefreshButton onClick={refresh} />
          <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="w-6 h-6 rounded-[var(--radius-md)] bg-muted hover:bg-muted/70" aria-label="缩小">−</button>
          <span className="w-10 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))} className="w-6 h-6 rounded-[var(--radius-md)] bg-muted hover:bg-muted/70" aria-label="放大">+</button>
          <button onClick={() => setZoom(1)} className="ml-1 px-2 h-6 rounded-[var(--radius-md)] bg-muted hover:bg-muted/70">复位</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto grid place-items-center p-6" style={chess}>
        {err ? (
          <ErrorState
            message="图片加载失败"
            onRetry={() => { setErr(false); setReloadTick(t => t + 1); }}
          />
        ) : (
          <img
            key={reloadTick}
            src={src}
            alt={name}
            style={{ transform: `scale(${zoom})` }}
            className="max-w-full max-h-full object-contain transition-transform"
            onLoad={e => setDim(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)}
            onError={() => setErr(true)}
          />
        )}
      </div>
    </div>
  );
}
