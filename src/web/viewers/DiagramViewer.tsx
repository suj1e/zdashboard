/**
 * 图表查看器:.excalidraw(官方渲染器 React.lazy 懒加载,只读画布)/ .drawio(diagrams.net 官方 viewer iframe)。
 * 懒加载边界必须留在本模块:excalidraw 的 JS 与 CSS(0.17+ 与 JS 分离)都必须经本模块内
 * 的动态 import 拉取——禁止任何顶层静态形态(含无 from 的副作用导入 `import '.../index.css'`,
 * 它同样形成静态依赖边,曾致 DiagramViewer 与 view/design Workspace chunk 全量预载 1.4MB
 * excalidraw,review B1;build 产物断言:scripts/check-excalidraw-lazy.mjs)。
 * resolve 语义同 MdViewer:view 根路径直取 / design 传代理解析。
 */
import { lazy, useMemo, useState, useEffect, useRef, Component, type ComponentProps, type ReactNode } from 'react';
import type * as ExcalidrawModule from '@excalidraw/excalidraw';
import { fetchText, viewerFetchErrorMessage } from '../lib/fetchJson.js';
import { ErrorState } from '../kit/index.js';
import { useViewerFreshness, RefreshButton } from './freshness.js';

/** 超大阈值(excalidraw):JSON 解析/渲染成本高 */
const MAX_EXCALIDRAW_BYTES = 2 * 1024 * 1024;
/** drawio 守卫按 encode 后长度(review S2):#R hash 契约要求 encodeURIComponent,
 *  ASCII 文本膨胀 ~3x,原始字节守卫防不住 ~700KB 文件膨胀出 ~2MB URL 静默白屏。
 *  600k 编码字符 ≈ 原 2MB 阈值等效约束(3x 膨胀)。 */
const MAX_DRAWIO_ENCODED_CHARS = 600_000;

/** 官方 viewer hash 契约:#R + encodeURIComponent(xml) = 只读回放 */
const DRAWIO_VIEWER_BASE = 'https://viewer.diagrams.net/?#R';

// lazy 边界:excalidraw 仅允许经此工厂的动态 import 进入构建图。
// CSS 必须并入同一 Promise(review B1):顶层静态 import CSS 会把 excalidraw chunk 变 eager。
function loadExcalidraw(): Promise<{ default: typeof ExcalidrawModule.Excalidraw }> {
  return Promise.all([
    import('@excalidraw/excalidraw'),
    import('@excalidraw/excalidraw/index.css'),
  ]).then(([m]) => ({ default: m.Excalidraw }));
}

/** 渲染器加载状态:加载中 null / 失败 loadErr / 就绪 Comp(S4 手动状态机,不用 React.lazy) */
type ExcalLoad = { Comp: typeof ExcalidrawModule.Excalidraw } | { loadErr: true } | null;

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

/** 懒 chunk 加载/渲染失败的局部兜底(review S4):只在图表子树内降级为错误态,不冒泡全局。
 *  兜底渲染期异常(如 excalidraw 内部 throw);加载本身的失败/重试由下方手动状态机接管——
 *  React 18 下 React.lazy 的 rejected thenable 在同树第二次 suspend 时重试调度会丢失
 *  (UI 永久卡 Suspense fallback,探针验证,含 key 重挂与 resetKey 两种 boundary 形态),
 *  故不用 React.lazy,状态机的失败/重试路径确定可控。 */
class ExcalidrawErrorBoundary extends Component<{ onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <Failure message="渲染器加载失败(网络中断或部署不一致)" onRetry={this.props.onRetry} />;
    }
    return this.props.children;
  }
}

export function DiagramViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const kind = kindOf(path);
  const [content, setContent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // files SSE(300ms 防抖)/手动刷新统一走版本号失效,重取保留旧内容语义同 MdViewer
  const [version, refresh] = useViewerFreshness();
  const loadedPathRef = useRef<string | null>(null);
  const [excal, setExcal] = useState<ExcalLoad>(null);
  const [excalAttempt, setExcalAttempt] = useState(0);

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

  // 渲染器手动懒加载(review S4):attempt 变化 → 重放动态 import,失败置 loadErr(局部错误态)
  // review S-B:仅 .excalidraw 需要 Excalidraw 渲染器——.drawio 等其他格式不预载 1.4MB chunk
  useEffect(() => {
    if (kind !== 'excalidraw') return;
    let alive = true;
    setExcal(null);
    loadExcalidraw()
      .then((m) => { if (alive) setExcal({ Comp: m.default }); })
      .catch(() => { if (alive) setExcal({ loadErr: true }); });
    return () => { alive = false; };
  }, [excalAttempt, kind]);

  // 编码开销只随 content 重算(review S5):2MB 文本每渲染重编码可达数十 ms。
  // 必须置于所有 early return 之前(Hooks 规则);content 为 null 时占位 0,守卫分支不可达。
  const rawBytes = useMemo(() => (content === null ? 0 : byteLength(content)), [content]);
  const drawioChars = useMemo(() => (content === null ? 0 : encodeURIComponent(content).length), [content]);

  // 仅「无内容且失败」才全屏 ErrorState;重取失败但有旧内容 → 保留旧内容(review S1,同 MdViewer)
  if (err && content === null) return <Failure message={err} onRetry={refresh} />;
  if (content === null) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;

  if (kind === 'excalidraw') {
    if (rawBytes > MAX_EXCALIDRAW_BYTES) {
      return <Failure message="文件过大,无法在线预览" onRetry={refresh} />;
    }
    // type-only 提取(0.18.1 未公开导出 ExcalidrawProps),编译期擦除,不破坏懒加载边界
    let scene: NonNullable<ComponentProps<typeof ExcalidrawModule.Excalidraw>['initialData']>;
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
        {/* 0.18.1 包样式不含根容器高度规则,消费方负责:直接子 .excalidraw 钉满高度,否则 canvas 撑爆 */}
        <div className="flex-1 min-h-0 [&>.excalidraw]:h-full">
          {excal === null ? (
            <p className="p-3 text-xs text-muted-foreground">加载渲染器…</p>
          ) : 'loadErr' in excal ? (
            <Failure message="渲染器加载失败(网络中断或部署不一致)" onRetry={() => setExcalAttempt((n) => n + 1)} />
          ) : (
            <ExcalidrawErrorBoundary onRetry={() => setExcalAttempt((n) => n + 1)}>
              {/* 0.18.1 无 renderConfig prop(design 草案按旧 API 书写,空对象无实效,已备案) */}
              <excal.Comp initialData={scene} viewModeEnabled />
            </ExcalidrawErrorBoundary>
          )}
        </div>
      </div>
    );
  }

  // .drawio:官方 viewer 只读回放;外部服务在线依赖,iframe 失败时降级链接始终可用
  if (drawioChars > MAX_DRAWIO_ENCODED_CHARS) {
    return <Failure message="文件过大,无法在线预览" onRetry={refresh} />;
  }
  const viewerUrl = DRAWIO_VIEWER_BASE + encodeURIComponent(content);
  return (
    <div className="flex flex-col h-full">
      {/* review S3:no-referrer——dashboard origin + 文件路径不作为 Referer 发给外部 viewer */}
      <iframe
        src={viewerUrl}
        title={path.slice(path.lastIndexOf('/') + 1)}
        referrerPolicy="no-referrer"
        className="flex-1 min-h-0 w-full border-0 bg-background"
      />
      <div className="flex-none px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-2">
        <span>由 diagrams.net 官方 viewer 只读渲染(需联网)</span>
        <a href={viewerUrl} target="_blank" rel="noreferrer noopener" className="underline hover:text-foreground">在新窗口打开 viewer</a>
      </div>
    </div>
  );
}
