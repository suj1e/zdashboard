import { useEffect, useState } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { ResizeHandle } from '../../web/components/ResizeHandle.js';

// 大纲栏拖拽调宽常量（design.md：clamp 176–400，默认即旧 w-44=176）
const MIN_OUTLINE_W = 176;
const MAX_OUTLINE_W = 400;
const DEFAULT_OUTLINE_W = 176;
const OUTLINE_W_KEY = 'zd-outline-w';

const clampWidth = (px: number) => Math.min(MAX_OUTLINE_W, Math.max(MIN_OUTLINE_W, px));

/** 首渲染读持久化宽度；非法（非数字/越界）忽略回退默认值，防闪烁 */
function readStoredOutlineW(): number {
  try {
    const raw = localStorage.getItem(OUTLINE_W_KEY);
    if (raw === null) return DEFAULT_OUTLINE_W;
    const n = Number(raw);
    return Number.isFinite(n) && n >= MIN_OUTLINE_W && n <= MAX_OUTLINE_W ? n : DEFAULT_OUTLINE_W;
  } catch {
    return DEFAULT_OUTLINE_W;
  }
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

interface OutlineNavProps {
  /** Ref to the rendered document container whose h1/h2/h3 anchors are inspected */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function OutlineNav({ containerRef }: OutlineNavProps) {
  const { icon } = useIcons();
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [width, setWidth] = useState(readStoredOutlineW);

  /** 写受控宽度（clamp 后）；persist=true 同步 localStorage */
  const applyWidth = (px: number, persist: boolean) => {
    const clamped = clampWidth(px);
    setWidth(clamped);
    if (persist) {
      try {
        localStorage.setItem(OUTLINE_W_KEY, String(clamped));
      } catch { /* storage 不可用时静默 */ }
    }
  };

  const resetWidth = () => {
    setWidth(DEFAULT_OUTLINE_W);
    try {
      localStorage.removeItem(OUTLINE_W_KEY);
    } catch { /* storage 不可用时静默 */ }
  };


  // Build outline from DOM anchors (rehype-slug has already generated id attributes)
  // 依赖内容信号: MdViewer 异步渲染,容器 ref 稳定,须在内容变化后重建,否则 mount 时 headings 为空
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    const build = () => {
      if (cancelled) return;
      const headings = el.querySelectorAll('h1[id], h2[id], h3[id]');
      const out: OutlineItem[] = [];
      headings.forEach((h) => {
        out.push({ id: h.id, text: h.textContent?.trim() ?? '', level: parseInt(h.tagName[1], 10) });
      });
      setItems(out);
    };
    build();
    const obs = new MutationObserver(build);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => { cancelled = true; obs.disconnect(); };
  }, [containerRef]);

  // Track which heading is currently in view via IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !items.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // pick the topmost visible heading
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
          setActiveId(top.target.id);
        }
      },
      { root: el, rootMargin: '-60px 0px -70% 0px', threshold: 0 }
    );

    items.forEach(({ id }) => {
      const node = el.querySelector(`#${CSS.escape(id)}`);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [items, containerRef]);

  const scrollTo = (id: string) => {
    const el = containerRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!items.length) return null;

  return (
    <nav
      className="hidden md:flex shrink-0 flex-col border-l py-2 overflow-hidden"
      style={{ width: `${width}px` }}
      aria-label="文档大纲"
    >
      {/* 把手为首层 flex 兄弟节点:不被内容覆盖/不随滚动移出,始终可拖拽 */}
      <ResizeHandle
        orientation="vertical"
        min={MIN_OUTLINE_W}
        max={MAX_OUTLINE_W}
        value={width}
        onChange={applyWidth}
        onReset={resetWidth}
        label="调整大纲宽度"
        className="flex-none w-1.5 cursor-col-resize"
      />
      <div className="flex-1 min-h-0 overflow-y-auto pl-3">
        <div className="flex items-center gap-1 mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {icon('file-text', 'h-3 w-3')}
          <span>大纲</span>
        </div>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                title={item.text}
                onClick={() => scrollTo(item.id)}
                className={`w-full text-left text-sm leading-snug py-0.5 px-1.5 rounded line-clamp-2 transition-colors ${
                  activeId === item.id
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/70'
                }`}
                style={{ paddingLeft: 6 + Math.min(item.level - 1, 2) * 10 }}
              >
                {item.text || item.id}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
