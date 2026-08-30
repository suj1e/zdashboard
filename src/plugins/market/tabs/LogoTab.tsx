/**
 * Logo 市场:simple-icons slug 目录网格(icon 经代理懒加载)+ 前端搜索(q URL 驱动)
 * + 选中详情:大图(代理)+ 风格特征事实 + SVG 源码(CodeViewer)+ 转提示词。
 * 降级:网格缩略图失败占位;详情大图失败可重试;源码代理失败 CodeViewer 错误态。
 */
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../../web/kit/index.js';
import { CodeViewer } from '../../../web/viewers/index.js';
import { proxyUrl, simpleIconSvg } from '../urls.js';
import { useCatalog } from '../useCatalog.js';
import { logoPrompt } from '../prompt.js';
import { PromptPanel } from '../PromptPanel.js';
import type { LogotypeEntry } from '../sources/index.js';

/** simple-icons 事实(design.md「风格特征注入」):全部图标单色几何、24×24 viewBox */
const SIMPLE_ICONS_FACTS = ['单色', '几何造型', '24×24 viewBox'];

export interface TabFilterProps {
  q: string | null;
  onSearch: (text: string) => void;
}

export default function LogoTab({ entry, onSelect, q, onSearch }: {
  entry: string | null;
  onSelect: (id: string | null) => void;
} & TabFilterProps) {
  const { entries, loading, error } = useCatalog<LogotypeEntry>('logos');
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [detailImgFailed, setDetailImgFailed] = useState(false);
  const [imgNonce, setImgNonce] = useState(0);
  const term = (q ?? '').trim().toLowerCase();
  const items = term
    ? entries.filter((e) => e.name.toLowerCase().includes(term) || e.id.includes(term))
    : entries;
  // 选中项优先从过滤结果取;被过滤掉时仍从全目录回退(详情不因搜索丢失)
  const selected = (entry ? items.find((e) => e.id === entry) ?? entries.find((e) => e.id === entry) : null) ?? null;

  // entry 切换重置大图失败态(重试经 nonce 换 key 重新挂载)
  useEffect(() => { setDetailImgFailed(false); }, [selected?.id]);
  // resolve 引用需稳定(CodeViewer 以 [path, resolve] 为 effect 依赖),随选中项对象身份变化
  const resolveSource = useMemo(
    () => (selected ? () => proxyUrl(simpleIconSvg(selected.id)) : undefined),
    [selected],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col" data-tab="logos">
      {selected && (
        <div className="flex-none flex items-start gap-4 border-b px-4 py-3" data-slot="logo-detail">
          {detailImgFailed ? (
            <button
              type="button"
              onClick={() => { setImgNonce((n) => n + 1); setDetailImgFailed(false); }}
              data-slot="logo-detail-fallback"
              className="h-24 w-24 grid place-items-center rounded-[var(--radius-lg)] border border-border bg-muted text-xs text-muted-foreground hover:bg-background transition-colors"
            >
              加载失败,点击重试
            </button>
          ) : (
            <img
              key={`${selected.id}-${imgNonce}`}
              src={proxyUrl(simpleIconSvg(selected.id))}
              alt={`${selected.name} logo`}
              data-slot="logo-detail-img"
              className="h-24 w-24"
              onError={() => setDetailImgFailed(true)}
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{selected.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">类别 {selected.category} · slug {selected.id}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SIMPLE_ICONS_FACTS.map((fact) => (
                <span key={fact} className="px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-xs text-muted-foreground">{fact}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      {selected && resolveSource && (
        <div className="flex-none h-44 border-b" data-slot="logo-source">
          <CodeViewer path={`${selected.id}.svg`} resolve={resolveSource} />
        </div>
      )}
      {selected && <PromptPanel market="logos" initial={logoPrompt({ name: selected.name })} />}
      <div className="flex-none px-3 pt-3">
        <input
          type="search"
          aria-label="搜索 Logo"
          placeholder="搜索品牌或 slug…"
          value={q ?? ''}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full max-w-xs h-8 px-2.5 rounded-[var(--radius-md)] border border-border bg-background text-xs focus:outline-none focus:border-primary"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {error ? (
          <EmptyState title="目录加载失败" hint={error} />
        ) : loading ? (
          <EmptyState title="目录加载中…" />
        ) : items.length === 0 ? (
          <EmptyState title={term ? `无匹配「${q}」的 Logo` : '暂无 Logo 目录'} hint={term ? '试试更短的关键词' : undefined} />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelect(e.id === entry ? null : e.id)}
                  aria-pressed={e.id === entry}
                  className="w-full h-full flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-border bg-background px-2 py-3 hover:bg-muted transition-colors"
                  data-slot="logo-card"
                >
                  {failed.has(e.id) ? (
                    <span className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-muted text-xs text-muted-foreground">{e.name.slice(0, 2)}</span>
                  ) : (
                    <img
                      src={proxyUrl(simpleIconSvg(e.id))}
                      alt={`${e.name} logo`}
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
