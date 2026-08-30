/**
 * 动效市场:demo 方块网格(库类名实时播放)+ 选中详情。
 * hover 重播 / 库 css 注入 / 源码查看 / 转提示词在 T4 增强(T1 骨架:class 组装 + entry 详情)。
 */
import { EmptyState } from '../../../web/kit/index.js';
import { useCatalog } from '../useCatalog.js';
import type { MotionEntry } from '../sources/index.js';

/** demo 元素最终 class:animate.css 需叠加 animate__animated 基类,hover.css 直接用库类 */
export function demoClassFor(lib: string, cls: string): string {
  return lib === 'animate.css' ? `animate__animated ${cls}` : cls;
}

export default function MotionTab({ entry, onSelect }: { entry: string | null; onSelect: (id: string | null) => void }) {
  const { entries, loading, error } = useCatalog<MotionEntry>('motions');
  const items = entries;
  const selected = entry ? items.find((e) => e.id === entry) ?? null : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="motions">
      {selected && (
        <div className="flex-none border-b px-4 py-3 flex items-center gap-4" data-slot="motion-detail">
          <div className={`grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-muted ${demoClassFor(selected.lib, selected.cls)}`}>
            <span className="text-lg">A</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{selected.desc}</p>
            <p className="text-xs text-muted-foreground font-mono">{selected.lib} · {selected.cls}</p>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : items.length === 0 ? (
          <EmptyState title="暂无动效目录" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
            {items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  aria-pressed={m.id === entry}
                  className="w-full h-full flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-background p-3 hover:bg-muted transition-colors"
                  data-slot="motion-card"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-muted text-foreground ${demoClassFor(m.lib, m.cls)}`} data-slot="motion-demo">
                    <span className="text-base">A</span>
                  </span>
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
