/**
 * Logo 市场:目录网格(icon 经代理懒加载)+ 选中详情。
 * 搜索过滤 / SVG 源码 / 转提示词在 T3 增强(此处为 T1 骨架:网格 + entry 详情)。
 */
import { useState } from 'react';
import { EmptyState } from '../../../web/kit/index.js';
import { proxyUrl, simpleIconSvg } from '../urls.js';
import { useCatalog } from '../useCatalog.js';
import type { LogotypeEntry } from '../sources/index.js';

export default function LogoTab({ entry, onSelect }: { entry: string | null; onSelect: (id: string | null) => void }) {
  const { entries, loading, error } = useCatalog<LogotypeEntry>('logos');
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const items = entries;
  const selected = entry ? items.find((e) => e.id === entry) ?? null : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="logos">
      {selected && (
        <div className="flex-none flex items-center gap-4 border-b px-4 py-3" data-slot="logo-detail">
          <img src={proxyUrl(simpleIconSvg(selected.id))} alt={selected.name} className="h-12 w-12" />
          <div>
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground">类别 {selected.category} · slug {selected.id}</p>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : items.length === 0 ? (
          <EmptyState title="暂无 Logo 目录" />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  aria-pressed={e.id === entry}
                  className="w-full h-full flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-background px-2 py-3 hover:bg-muted transition-colors"
                  data-slot="logo-card"
                >
                  {failed.has(e.id) ? (
                    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-muted text-xs text-muted-foreground">{e.name.slice(0, 2)}</span>
                  ) : (
                    <img
                      src={proxyUrl(simpleIconSvg(e.id))}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8"
                      onError={() => setFailed((prev) => new Set(prev).add(e.id))}
                    />
                  )}
                  <span className="text-xs text-foreground/90 truncate max-w-full">{e.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
