/**
 * 图表查看器:.excalidraw(官方渲染器 React.lazy 懒加载,只读画布)/ .drawio(diagrams.net 官方 viewer iframe)。
 * 懒加载边界必须留在本模块:React.lazy import('@excalidraw/excalidraw') 不得上移,
 * 保证主包与 view/design 常规 chunk 不含 excalidraw(build 产物独立 chunk 断言依赖此约定)。
 * resolve 语义同 MdViewer:view 根路径直取 / design 传代理解析。
 */
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { fetchText, viewerFetchErrorMessage } from '../lib/fetchJson.js';
import { ErrorState } from '../kit/index.js';
import { useViewerFreshness, RefreshButton } from './freshness.js';

/** 超大阈值:excalidraw 解析成本高;drawio 编码进 hash 会超浏览器 URL 长度限制 */
const MAX_DIAGRAM_BYTES = 2 * 1024 * 1024;

/** 官方 viewer hash 契约:#R + encodeURIComponent(xml) = 只读回放 */
const DRAWIO_VIEWER_BASE = 'https://viewer.diagrams.net/?#R';

// lazy 边界:仅此处允许出现该动态 import
const Excalidraw = lazy(() =>
  import('@excalidraw/excalidraw').then((m) => ({ default: m.Excalidraw })),
);

type Kind = 'excalidraw' | 'drawio';

/** 扩展名只从文件名段截取(路径含 .zdev 等点前缀目录时整段截取会误判,同 view viewerFor) */
function kindOf(path: string): Kind | null {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name.endsWith('.excalidraw')) return 'excalidraw';
  if (name.endsWith('.drawio')) return 'drawio';
  return null;
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** 错误/降级统一态(retry 走版本号失效重取) */
function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col p-4">
      <ErrorState message={message} onRetry={onRetry} />
    </div>
  );
}

export function DiagramViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const kind = kindOf(path);
  const [content, setContent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // files SSE(300ms 防抖)/手动刷新统一走版本号失效,重取保留旧内容语义同 MdViewer
  const [version, refresh] = useViewerFreshness();
  const loadedPathRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (loadedPathRef.current !== path) {
      loadedPathRef.current = path;
      setContent(null);
      setErr(null);
    } else {
      setErr(null);
    }
    if (!kind) { setErr('不支持的图表格式'); return; }
    fetchText(resolve ? resolve(path) : '/__file-content/' + encodeURI(path), { cache: 'no-store' })
      .then((t) => { if (alive) { setContent(t); setErr(null); } })
      .catch((e) => { if (alive) setErr(viewerFetchErrorMessage(e)); });
    return () => { alive = false; };
  }, [path, resolve, version, kind]);

  if (err) return <Failure message={err} onRetry={refresh} />;
  if (content === null) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;

  if (byteLength(content) > MAX_DIAGRAM_BYTES) {
    return <Failure message="文件过大(超过 2MB),无法在线预览" onRetry={refresh} />;
  }

  if (kind === 'excalidraw') {
    let scene: unknown;
    try {
      scene = JSON.parse(content);
    } catch {
      return <Failure message="文件内容损坏:不是有效的 Excalidraw JSON" onRetry={refresh} />;
    }
    return (
      <div className="relative flex flex-col h-full">
        <div className="absolute right-2 top-2 z-10">
          <RefreshButton onClick={refresh} />
        </div>
        <div className="flex-1 min-h-0">
          <Suspense fallback={<p className="p-3 text-xs text-muted-foreground">加载渲染器…</p>}>
            <Excalidraw initialData={scene} viewModeEnabled renderConfig={{}} />
          </Suspense>
        </div>
      </div>
    );
  }

  // .drawio:官方 viewer 只读回放;外部服务在线依赖,iframe 失败时降级链接始终可用
  const viewerUrl = DRAWIO_VIEWER_BASE + encodeURIComponent(content);
  return (
    <div className="flex flex-col h-full">
      <iframe src={viewerUrl} title={path.slice(path.lastIndexOf('/') + 1)} className="flex-1 min-h-0 w-full border-0 bg-background" />
      <div className="flex-none px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-2">
        <span>由 diagrams.net 官方 viewer 只读渲染(需联网)</span>
        <a href={viewerUrl} target="_blank" rel="noreferrer noopener" className="underline hover:text-foreground">在新窗口打开 viewer</a>
      </div>
    </div>
  );
}
