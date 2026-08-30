/**
 * 灵感市场:目录网格(name/desc/tags)+ 选中详情(新窗口打开原站)。
 * 标签过滤 / 特征清单 / 转提示词在 T5 增强(T1 骨架:网格 + entry 详情)。
 */
import { EmptyState } from '../../../web/kit/index.js';
import { useCatalog } from '../useCatalog.js';
import type { InspirationEntry } from '../sources/index.js';

export default function InspirationTab({ entry, onSelect }: { entry: string | null; onSelect: (id: string | null) => void }) {
  const { entries, loading, error } = useCatalog<InspirationEntry>('inspirations');
  const items = entries;
  const selected = entry ? items.find((e) => e.id === entry) ?? null : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="inspirations">
      {selected && (
        <div className="flex-none border-b px-4 py-3 flex items-start gap-3" data-slot="inspiration-detail">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selected.desc}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {selected.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-xs text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
          <a
            href={selected.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex-none px-2.5 h-6 inline-flex items-center rounded-[var(--radius-md)] border border-border bg-background text-xs hover:bg-muted transition-colors"
          >
            新窗口打开
          </a>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : items.length === 0 ? (
          <EmptyState title="暂无灵感目录" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={s.id === entry}
                  className="w-full h-full flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border bg-background p-3 text-left hover:bg-muted transition-colors"
                  data-slot="inspiration-card"
                >
                  <span className="text-xs font-medium text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">{s.desc}</span>
                  <span className="flex flex-wrap gap-1 mt-auto pt-1">
                    {s.tags.slice(0, 3).map((t) => (
                      <span key={t} className="px-1.5 rounded-[var(--radius-full)] bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
