import { useState } from 'react';
import { ErrorState } from '../kit/index.js';

/** resolve:可选整 URL 解析器(不传 = 根路径直取,view 插件语义);design 插件传代理路由解析 */
export function ImageViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const [dim, setDim] = useState('-');
  const [zoom, setZoom] = useState(1);
  const [err, setErr] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const name = path.split('/').pop();
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
            src={resolve ? resolve(path) : '/' + encodeURI(path)}
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
