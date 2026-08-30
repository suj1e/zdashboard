/**
 * 动效市场:demo 方块网格(库类名实时播放,hover 重播)+ 选中详情(源码 + 时序参数 + 转提示词)。
 * 库 css 按需经 /__market/proxy 拉取注入 <style>(模块级缓存同 lib 一次);
 * 断网降级:目录仍可浏览,demo 静态展示,提示词以占位语义照常可用。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../../web/kit/index.js';
import { ANIMATE_CSS_URL, HOVER_CSS_URL, proxyUrl } from '../urls.js';
import { useCatalog } from '../useCatalog.js';
import { motionPrompt } from '../prompt.js';
import { PromptPanel } from '../PromptPanel.js';
import { extractClassRule, extractTiming, motionSourceOf } from '../motion-css.js';
import type { MotionEntry } from '../sources/index.js';

/** demo 元素最终 class:animate.css 需叠加 animate__animated 基类,hover.css 直接用库类 */
export function demoClassFor(lib: string, cls: string): string {
  return lib === 'animate.css' ? `animate__animated ${cls}` : cls;
}

function demoClassParts(lib: string, cls: string): string[] {
  return lib === 'animate.css' ? ['animate__animated', cls] : [cls];
}

/** 库 css 拉取 URL 表(白名单 CDN,pinned 版本) */
const LIB_CSS_URLS: Record<MotionEntry['lib'], string> = {
  'animate.css': ANIMATE_CSS_URL,
  'hover.css': HOVER_CSS_URL,
};

/** 离线时提示词内的源码占位语义(模板不因断网空白) */
const MOTION_SOURCE_OFFLINE_FALLBACK = '(离线,源码暂不可用,可稍后重试)';

// ---------------------------------------------------------------------------
// 库 css 拉取与注入
// ---------------------------------------------------------------------------

/** 模块级缓存:同 lib 一次拉取,页面内切 Tab 不重复请求 */
const libCssCache = new Map<string, string>();

/** 测试注入:清空库 css 缓存 */
export function __resetMotionLibCssForTest(): void {
  libCssCache.clear();
}

function useLibCss(lib: MotionEntry['lib'], enabled: boolean): { css: string | null; failed: boolean } {
  const [css, setCss] = useState<string | null>(() => libCssCache.get(lib) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const cached = libCssCache.get(lib);
    if (cached !== undefined) { setCss(cached); setFailed(false); return; }
    let alive = true;
    fetch(proxyUrl(LIB_CSS_URLS[lib]), { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!alive) return;
        libCssCache.set(lib, text);
        setCss(text);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [lib, enabled]);
  return { css, failed };
}

/** 库 css 注入 <style>(来源为 allowlist CDN 的库文件,非外部页面内容) */
function LibStyle({ lib, css }: { lib: MotionEntry['lib']; css: string | null }) {
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} data-market-motion-lib={lib} />;
}

// ---------------------------------------------------------------------------
// demo 方块(hover 重播:class 卸下 → 强制 reflow → 复挂)
// ---------------------------------------------------------------------------

function MotionDemo({ m, playing, large }: { m: MotionEntry; playing: boolean; large?: boolean }) {
  const [replays, setReplays] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const parts = demoClassParts(m.lib, m.cls);
  const replay = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove(...parts);
    void el.offsetWidth; // 强制 reflow 重置 CSS 动画
    el.classList.add(...parts);
    setReplays((r) => r + 1);
  };
  return (
    <span
      ref={ref}
      onMouseEnter={replay}
      data-slot="motion-demo"
      data-replays={replays}
      className={`grid ${large ? 'h-12 w-12' : 'h-10 w-10'} place-items-center rounded-[var(--radius-md)] bg-muted text-foreground ${playing ? demoClassFor(m.lib, m.cls) : ''}`}
    >
      <span className={large ? 'text-lg' : 'text-base'}>A</span>
    </span>
  );
}

// ---------------------------------------------------------------------------

export default function MotionTab({ entry, onSelect }: { entry: string | null; onSelect: (id: string | null) => void }) {
  const { entries, loading, error } = useCatalog<MotionEntry>('motions');
  const libs = useMemo(() => [...new Set(entries.map((e) => e.lib))], [entries]);
  const animate = useLibCss('animate.css', libs.includes('animate.css'));
  const hover = useLibCss('hover.css', libs.includes('hover.css'));
  const libState = (lib: MotionEntry['lib']) => (lib === 'hover.css' ? hover : animate);
  const cssFailed = libs.length > 0 && libs.some((l) => libState(l).failed);

  const selected = entry ? entries.find((e) => e.id === entry) ?? null : null;
  const selectedLib = selected?.lib;
  const selectedCss = selected ? libState(selected.lib).css : null;
  const source = selected && selectedCss ? motionSourceOf(selectedCss, selected.cls) : null;
  // 时序参数 = 基类时长(animate.css 的 .animate__animated)∪ entry 源码参数(关键帧缓动等,后者覆盖同名)
  const baseTiming = selectedLib === 'animate.css' && selectedCss
    ? extractTiming(extractClassRule(selectedCss, 'animate__animated') ?? '')
    : {};
  const timing = { ...baseTiming, ...extractTiming(source ?? '') };

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="motions">
      {libs.map((lib) => <LibStyle key={lib} lib={lib} css={libState(lib).css} />)}
      {selected && (
        <div className="flex-none border-b px-4 py-3 flex items-start gap-4" data-slot="motion-detail">
          <MotionDemo m={selected} playing={!!selectedCss} large />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.desc}</p>
            <p className="text-xs text-muted-foreground font-mono">{selected.lib} · {selected.cls}</p>
            {source && (
              <div className="flex flex-wrap gap-1 mt-1.5" data-slot="motion-timing">
                {[timing.duration, timing.iteration, timing.easing].filter(Boolean).map((t) => (
                  <span key={t as string} className="px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-xs text-muted-foreground font-mono">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {selected && (
        source ? (
          <pre
            data-slot="motion-source"
            className="flex-none max-h-40 overflow-auto m-0 border-b px-4 py-2 text-xs leading-relaxed bg-terminal-bg text-terminal-fg whitespace-pre-wrap"
          >
            {source}
          </pre>
        ) : (
          <div data-slot="motion-source-error" className="flex-none border-b px-4 py-2 text-xs text-muted-foreground">
            动效源码不可用({selected.lib} CSS 加载失败,可稍后重试)
          </div>
        )
      )}
      {selected && (
        <PromptPanel
          market="motions"
          initial={motionPrompt({ name: selected.name, desc: selected.desc, css: source ?? MOTION_SOURCE_OFFLINE_FALLBACK })}
        />
      )}
      {cssFailed && (
        <p className="flex-none px-4 py-1.5 text-xs text-muted-foreground" data-slot="motion-css-fallback">
          动效库 CSS 加载失败,演示不可播放;目录仍可浏览,提示词照常可用。
        </p>
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : entries.length === 0 ? (
          <EmptyState title="暂无动效目录" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
            {entries.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id === entry ? null : m.id)}
                  aria-pressed={m.id === entry}
                  className="w-full h-full flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-background p-3 hover:bg-muted transition-colors"
                  data-slot="motion-card"
                >
                  <MotionDemo m={m} playing={!!libState(m.lib).css} />
                  <span className="text-xs font-medium text-foreground text-left">{m.name}</span>
                  <span className="text-xs text-muted-foreground text-left line-clamp-2">{m.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
