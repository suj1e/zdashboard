import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { EmptyState } from '../../../web/components/EmptyState.js';
import { Check, ChevronDown, ChevronUp, RotateCcw, Send, X } from 'lucide-react';
import { useSSE } from '../../../web/hooks/useSSE';
import { MdViewer } from '../../../web/viewers/MdViewer.js';
import { ProgressBar } from '../../../web/components/ProgressBar.js';
import { FilterPills } from '../../../web/components/FilterPills.js';

type ItemState = 'open' | 'answered' | 'accepted' | 'dismissed';
type ReviewStatus = 'draft' | 'reviewing' | 'passed' | 'rejected';

interface ReviewItem {
  id: string;
  doc?: string;
  category?: string;
  severity?: 'high' | 'medium' | 'low';
  state: ItemState;
  question: string;
  answer?: string;
}

interface ReviewData {
  status: ReviewStatus;
  items: ReviewItem[];
}

const STATUS_BADGE: Record<ReviewStatus, string> = {
  draft: 'bg-muted-foreground text-white',
  reviewing: 'bg-warning text-white',
  passed: 'bg-success text-white',
  rejected: 'bg-destructive text-white',
};
const STATUS_TEXT: Record<ReviewStatus, string> = {
  draft: '草案', reviewing: '评审中', passed: '已通过', rejected: '未通过',
};
const FILTERS: { key: ItemState | 'all'; label: string }[] = [
  { key: 'all', label: '全部' }, { key: 'open', label: '待处理' },
  { key: 'answered', label: '已答复' }, { key: 'accepted', label: '已采纳' }, { key: 'dismissed', label: '已驳回' },
];
const SEV_COLOR: Record<string, string> = { high: 'bg-destructive', medium: 'bg-warning', low: 'bg-info' };
const SEV_TEXT: Record<string, string> = { high: '高', medium: '中', low: '低' };
const STATE_BADGE: Record<ItemState, string> = {
  open: 'bg-destructive/15 text-destructive border-destructive/30',
  answered: 'bg-info/15 text-info border-info/30',
  accepted: 'bg-success/15 text-success border-success/30',
  dismissed: 'bg-muted text-muted-foreground border-border',
};
const STATE_TEXT: Record<ItemState, string> = {
  open: '待处理', answered: '已答复', accepted: '已采纳', dismissed: '已驳回',
};

function ItemCard({ item, token, onUpdated }: { item: ReviewItem; token: string; onUpdated: (d: ReviewData) => void }) {
  const [answer, setAnswer] = useState(item.answer ?? '');
  useEffect(() => setAnswer(item.answer ?? ''), [item.id, item.answer]);

  const post = async (body: object) => {
    const r = await fetch('/__review/item', {
      method: 'POST', headers: { 'x-stop-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...body }),
    });
    if (r.ok) onUpdated(await r.json());
  };

  const next = (state: ItemState) => {
    // 状态流转:open → answered → accepted/dismissed;已定态可撤销回 open
    if (state === 'open') return { state, answer };
    if (state === 'answered') return { state, answer };
    return { state, answer: answer || item.answer };
  };

  const done = item.state === 'accepted' || item.state === 'dismissed';
  const hint = done
    ? (item.state === 'accepted' ? '已采纳 — 可撤销后重新处理' : '已驳回 — 可撤销后重新处理')
    : (item.state === 'open' ? '答复后可采纳或驳回,或直接采纳/驳回' : '确认答复后采纳,或驳回 / 撤销');

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2.5 text-[11px] text-muted-foreground">
        {item.severity && <span className={`h-2 w-2 rounded-full ${SEV_COLOR[item.severity] ?? 'bg-muted-foreground'}`} />}
        <span className="font-medium">{item.category ?? '通用'}</span>
        {item.severity && <span>{SEV_TEXT[item.severity] ?? item.severity}</span>}
        <span className={`ml-auto px-1.5 py-0.5 rounded border text-[10px] font-medium ${STATE_BADGE[item.state] ?? ''}`}>{STATE_TEXT[item.state]}</span>
      </div>
      <p className="px-3 py-2 text-sm leading-relaxed">{item.question}</p>
      <div className="px-3 pb-3 flex flex-col gap-2">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="答复 / 补充说明…"
          rows={2}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:border-primary resize-y"
        />
        <div className="flex items-center gap-1.5">
          {item.state === 'accepted' ? (
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-success/15 text-success text-xs font-medium">
              <Check className="h-3 w-3" />已采纳
            </span>
          ) : item.state === 'dismissed' ? (
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-muted text-muted-foreground text-xs font-medium">
              <X className="h-3 w-3" />已驳回
            </span>
          ) : (
            <>
              <button onClick={() => post(next('answered'))} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-info hover:bg-info text-white text-xs">
                <Send className="h-3 w-3" />{item.state === 'answered' ? '更新答复' : '答复'}
              </button>
              <button onClick={() => post(next('accepted'))} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-success hover:bg-success text-white text-xs">
                <Check className="h-3 w-3" />采纳
              </button>
              <button onClick={() => post(next('dismissed'))} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-muted hover:bg-muted/70 text-xs">
                <X className="h-3 w-3" />驳回
              </button>
            </>
          )}
          {done && (
            <button onClick={() => post(next('open'))} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-muted hover:bg-muted/70 text-xs">
              <RotateCcw className="h-3 w-3" />撤销
            </button>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReviewViewer() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [doc, setDoc] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [filter, setFilter] = useState<ItemState | 'all'>('all');
  const [docOpen, setDocOpen] = useState(true);
  const [err, setErr] = useState('');
  const stopped = useRef(false);

  const reload = () => {
    fetch('/__review', { cache: 'no-store' }).then(r => r.json()).then(setData);
    fetch('/__docs', { cache: 'no-store' }).then(r => r.json()).then((ds: string[]) => {
      setDocs(ds);
      setDoc(cur => (cur && ds.includes(cur) ? cur : ds[0] ?? null));
    });
  };

  useEffect(() => { reload(); fetch('/__config').then(r => r.json()).then(c => setToken(c.stopToken ?? '')); }, []);
  useSSE(() => {}, reload, stopped);

  const counts = { all: 0, open: 0, answered: 0, accepted: 0, dismissed: 0 } as Record<ItemState | 'all', number>;
  for (const i of data?.items ?? []) { counts.all++; counts[i.state]++; }

  // 左栏:按文档分组的评审项(单个维度,文档与问题不再分离)
  const groups = useMemo(() => {
    const map = new Map<string | null, ReviewItem[]>();
    for (const i of data?.items ?? []) {
      if (filter !== 'all' && i.state !== filter) continue;
      const k = i.doc ?? null;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    }
    const order = (a: string | null) => a ?? '(未关联文档)';
    return [...map.entries()]
      .sort((a, b) => order(a[0]).localeCompare(order(b[0])))
      .map(([d, items]) => ({
        doc: d,
        label: order(d),
        items: items.sort((x, y) => ({ high: 0, medium: 1, low: 2 })[x.severity ?? 'medium'] - ({ high: 0, medium: 1, low: 2 })[y.severity ?? 'medium']),
      }));
  }, [data, filter]);

  const current = (data?.items ?? []).find(i => i.id === currentId) ?? null;

  const selectItem = (i: ReviewItem) => {
    setCurrentId(i.id);
    setDoc(i.doc ?? null);
  };

  const pass = async () => {
    setErr('');
    const r = await fetch('/__review/status', { method: 'POST', headers: { 'x-stop-token': token, 'Content-Type': 'application/json' }, body: '{"status":"passed"}' });
    if (r.ok) setData(await r.json());
    else setErr((await r.json()).error ?? 'failed');
  };

  return (
    <div className="mx-auto h-full max-w-6xl bg-background border rounded-lg shadow-sm overflow-hidden flex">
      <aside className="w-[240px] flex-none border-r bg-background overflow-auto">
        <div className="px-3 pt-3 pb-2 border-b">
          {(() => {
            const total = counts.all;
            const processed = total - counts.open;
            const p = total === 0 ? 0 : Math.round((processed / total) * 100);
            return (
              <>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground">处理进度</span>
                  <span className="font-mono">{processed}/{total} · {p}%</span>
                </div>
                <ProgressBar value={p} className="h-1.5" />
              </>
            );
          })()}
        </div>
        <FilterPills
          items={FILTERS.map(f => ({ key: String(f.key), label: `${f.label} ${counts[f.key]}` }))}
          value={filter}
          onChange={(v) => setFilter(v as ItemState | 'all')}
          ariaLabel="评审项筛选"
        />
        <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">文档 · 评审项</div>
        {groups.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">无评审项</p>}
        {groups.map(g => (
          <div key={g.doc ?? '(none)'}>
            <div className="px-3 py-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <span className="truncate">{g.label}</span>
              <span className="ml-auto font-mono text-[10px]">{g.items.length}</span>
            </div>
            {g.items.map(i => (
              <button key={i.id} onClick={() => selectItem(i)}
                className={`w-full text-left px-3 py-1.5 text-xs border-l-2 flex items-center gap-1.5 hover:bg-muted ${currentId === i.id ? 'bg-muted font-medium border-primary' : 'border-transparent text-muted-foreground'}`}>
                {i.severity && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEV_COLOR[i.severity] ?? ''}`} />}
                <span className="truncate">{i.question}</span>
                <span className={`ml-auto shrink-0 text-[9px] px-1 rounded ${STATE_BADGE[i.state] ?? ''}`}>{STATE_TEXT[i.state]}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-none flex items-center gap-2 px-3.5 border-b bg-background">
          {data && <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_BADGE[data.status] ?? ''}`}>{STATUS_TEXT[data.status] ?? data.status}</span>}
          {counts.open > 0 && <span className="text-[11px] text-muted-foreground">还有 {counts.open} 项待处理</span>}
          <button onClick={pass} disabled={!data || data.status === 'passed' || counts.open > 0}
            className="ml-auto h-7 px-3 rounded bg-success hover:bg-success disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs">
            通过
          </button>
        </div>
        {err && <div className="bg-destructive/10 text-destructive text-xs px-3.5 py-1.5 border-b border-destructive/20">{err}</div>}
        <div className="flex-1 min-h-0 flex flex-col">
          {docOpen && (
            <div className="flex-1 min-h-0 overflow-auto border-b bg-background relative">
              <button onClick={() => setDocOpen(false)} title="收起文档"
                className="absolute right-2 top-2 z-10 h-6 px-2 rounded border border-border bg-background/80 text-xs hover:bg-muted">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {doc ? <MdViewer path={doc} /> : <p className="p-6 text-sm text-muted-foreground">在左侧选择评审项</p>}
            </div>
          )}
          <div className={docOpen ? 'flex-none h-[42%] border-b overflow-auto p-3 flex flex-col gap-3' : 'flex-1 min-h-0 overflow-auto p-3 flex flex-col gap-3 dot-grid'}>
            {!docOpen && (
              <button onClick={() => setDocOpen(true)} title="展开文档"
                className="self-start inline-flex items-center gap-1 h-6 px-2 rounded border border-border bg-background text-xs hover:bg-muted">
                <ChevronUp className="h-3.5 w-3.5" />展开文档
              </button>
            )}
            {current ? <ItemCard key={current.id} item={current} token={token} onUpdated={setData} />
              : <p className="text-xs text-muted-foreground text-center pt-6">在左侧选择一个评审项</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
