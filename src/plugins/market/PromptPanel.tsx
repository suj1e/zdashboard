/**
 * PromptPanel:三市场统一的「转提示词」面板。
 * 模板填充(外层算 initial)→ textarea 可编辑 → 复制(clipboard,失败 fallback 选中全文提示手动复制)
 * → toast(sonner)→ 最近 5 条 localStorage 可回看复用。
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  loadPromptHistory,
  recordPromptHistory,
  MARKET_LABELS,
  type MarketKey,
  type PromptRecord,
} from './prompt.js';

export function PromptPanel({ market, initial }: { market: MarketKey; initial: string }) {
  const [draft, setDraft] = useState(initial);
  const [history, setHistory] = useState<PromptRecord[]>([]);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // entry/补充输入变化 → 模板重置草稿
  useEffect(() => { setDraft(initial); }, [initial]);
  useEffect(() => { setHistory(loadPromptHistory()); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success('已复制到剪贴板');
      setHistory(recordPromptHistory({ market, text: draft }));
    } catch {
      // 剪贴板权限拒绝/不可用:选中全文提示手动复制
      boxRef.current?.focus();
      boxRef.current?.select();
      toast.error('复制失败,已选中文本,请按 Ctrl/Cmd+C 手动复制');
    }
  };

  return (
    <section aria-label="转提示词" className="border-t border-border px-4 py-3 flex flex-col gap-2 text-xs" data-slot="prompt-panel">
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">转提示词 · {MARKET_LABELS[market]}</span>
        <button
          type="button"
          aria-label="复制提示词"
          onClick={copy}
          className="ml-auto px-2.5 h-6 rounded-[var(--radius-md)] border border-border bg-background hover:bg-muted transition-colors"
        >
          复制
        </button>
      </div>
      <textarea
        ref={boxRef}
        aria-label="提示词"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-[var(--radius-md)] border border-border bg-background px-2.5 py-2 text-xs leading-relaxed focus:outline-none focus:border-primary"
      />
      {history.length > 0 && (
        <div data-slot="prompt-history" className="flex flex-col gap-1">
          <span className="text-muted-foreground">最近提示词(可回看复用)</span>
          <ul className="flex flex-col gap-1 max-h-28 overflow-auto">
            {history.map((r, i) => (
              <li key={`${r.at}-${i}`}>
                <button
                  type="button"
                  onClick={() => setDraft(r.text)}
                  className="w-full text-left px-2 py-1 rounded-[var(--radius-sm)] hover:bg-muted transition-colors flex items-center gap-2 min-w-0"
                >
                  <span className="flex-none px-1.5 py-0.5 rounded-[var(--radius-full)] bg-muted text-muted-foreground">{MARKET_LABELS[r.market] ?? r.market}</span>
                  <span className="truncate text-muted-foreground">{r.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
