import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

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
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    <nav className="hidden md:flex w-44 shrink-0 flex-col border-l pl-3 py-2 overflow-y-auto" aria-label="文档大纲">
      <div className="flex items-center gap-1 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <FileText className="h-3 w-3" />
        <span>大纲</span>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`w-full text-left text-[11px] leading-snug py-0.5 px-1.5 rounded truncate transition-colors ${
                activeId === item.id
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted/70'
              }`}
              style={{ paddingLeft: 6 + (item.level - 1) * 10 }}
            >
              {item.text || item.id}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
