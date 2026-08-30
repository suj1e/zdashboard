/**
 * 灵感市场:目录网格(name/desc/tags)+ 标签过滤(tag pills 写回 URL q,q 同搜 name/desc/tags)
 * + 选中详情(元数据 + 新窗口打开原站)+ 转提示词(元数据模板 + 用户补充输入)。
 * 第三方站点不可 iframe:诚实降级为新窗口打开(design 决策)。
 */
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../../web/kit/index.js';
import { FilterPills, type FilterItem } from '../../../web/components/FilterPills.js';
import { useCatalog } from '../useCatalog.js';
import { inspirationPrompt } from '../prompt.js';
import { PromptPanel } from '../PromptPanel.js';
import type { InspirationEntry } from '../sources/index.js';
import type { TabFilterProps } from './LogoTab.js';

/** 标签 pills 上限(按出现频次取最高频标签,避免 pills 泛滥) */
const TAG_PILLS_LIMIT = 12;

export default function InspirationTab({ entry, onSelect, q, onSearch }: {
  entry: string | null;
  onSelect: (id: string | null) => void;
} & TabFilterProps) {
  const { entries, loading, error } = useCatalog<InspirationEntry>('inspirations');
  const [extra, setExtra] = useState('');
  const term = (q ?? '').trim().toLowerCase();
  const items = term
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(term)
        || e.desc.toLowerCase().includes(term)
        || e.tags.some((t) => t.toLowerCase().includes(term)))
    : entries;
  const selected = (entry ? items.find((e) => e.id === entry) ?? entries.find((e) => e.id === entry) : null) ?? null;

  // entry 切换重置补充输入(补充要求属于详情上下文)
  useEffect(() => { setExtra(''); }, [selected?.id]);

  /** 高频标签 pills(含「全部」);q 恰为某标签时该 pill 激活 */
  const tagItems = useMemo<FilterItem[]>(() => {
    const freq = new Map<string, number>();
    for (const e of entries) for (const t of e.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    const top = [...freq.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TAG_PILLS_LIMIT)
      .map(([t]) => t);
    return [{ key: '', label: '全部' }, ...top.map((t) => ({ key: t, label: t }))];
  }, [entries]);
  const activeTag = tagItems.some((i) => i.key !== '' && i.key === q) ? q ?? '' : '';

  const changeTag = (tag: string) => {
    // 空键 = 全部;再次点击激活标签 = 取消过滤
    onSearch(tag === '' || tag === q ? '' : tag);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="inspirations">
      <div className="flex-none px-3 pt-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          aria-label="搜索灵感"
          placeholder="搜索名称/描述/标签…"
          value={q ?? ''}
          onChange={(e) => onSearch(e.target.value)}
          className="w-56 h-8 px-2.5 rounded-[var(--radius-md)] border border-border bg-background text-xs focus:outline-none focus:border-primary"
        />
        <FilterPills ariaLabel="标签过滤" items={tagItems} value={activeTag} onChange={changeTag} className="min-w-0" />
      </div>
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
      {selected && (
        <div className="flex-none px-4 pt-3">
          <input
            type="text"
            aria-label="补充要求"
            placeholder="补充要求(如:暗色模式优先、要求响应式…)"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="w-full h-8 px-2.5 rounded-[var(--radius-md)] border border-border bg-background text-xs focus:outline-none focus:border-primary"
          />
        </div>
      )}
      {selected && (
        <PromptPanel
          market="inspirations"
          initial={inspirationPrompt({ name: selected.name, url: selected.url, tags: selected.tags, extra })}
        />
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : items.length === 0 ? (
          <EmptyState title={term ? `无匹配「${q}」的灵感` : '暂无灵感目录'} hint={term ? '试试其他标签或关键词' : undefined} />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {items.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id === entry ? null : s.id)}
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
