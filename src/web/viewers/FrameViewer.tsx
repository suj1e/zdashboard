import { useViewerFreshness, RefreshButton } from './freshness.js';

/** iframe 预览:pdf/html 等浏览器可原生渲染的类型;resolve 语义同 ImageViewer(view 根直取 / design 代理) */
export function FrameViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const [version, refresh] = useViewerFreshness();
  const name = path.split('/').pop();
  const base = resolve ? resolve(path) : '/' + encodeURI(path);
  const src = version ? `${base}${base.includes('?') ? '&' : '?'}v=${version}` : base;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-4 py-2 border-b text-xs flex items-center gap-3">
        <span className="font-mono text-foreground">{name}</span>
        <div className="ml-auto">
          <RefreshButton onClick={refresh} />
        </div>
      </div>
      <iframe src={src} title={name} className="flex-1 min-h-0 w-full bg-background" />
    </div>
  );
}
