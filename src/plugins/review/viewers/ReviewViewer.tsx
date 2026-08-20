import React, { useEffect, useRef, useState } from 'react';
import { Check, X, Send } from 'lucide-react';
import { useSSE } from '../../../web/hooks/useSSE';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

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
  draft: 'bg-zinc-500 text-white',
  reviewing: 'bg-amber-500 text-white',
  passed: 'bg-emerald-600 text-white',
  rejected: 'bg-red-500 text-white',
};
const STATUS_TEXT: Record<ReviewStatus, string> = {
  draft: '草案', reviewing: '评审中', passed: '已通过', rejected: '未通过',
};
const FILTERS: { key: ItemState | 'all'; label: string }[] = [
  { key: 'all', label: '全部' }, { key: 'open', label: '待处理' },
  { key: 'answered', label: '已答复' }, { key: 'accepted', label: '已采纳' }, { key: 'dismissed', label: '已驳回' },
];
const SEV_COLOR: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-sky-500' };
const SEV_TEXT: Record<string, string> = { high: '高', medium: '中', low: '低' };
const STATE_CLS: Record<ItemState, string> = {
  open: 'border-l-red-500', answered: 'border-l-sky-500',
  accepted: 'border-l-emerald-500', dismissed: 'border-l-zinc-400',
};
const STATE_TEXT: Record<ItemState, string> = {
  open: '待处理', answered: '已答复', accepted: '已采纳', dismissed: '已驳回',
};

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch (e) { console.error('[zdashboard] clipboard copy failed:', e); }
  };
  return (
    <div className="not-prose relative my-4 group">
      <button onClick={copy} className="absolute right-2 top-2 z-10 px-2 py-0.5 rounded border border-border bg-background/80 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? '已复制' : '复制'}
      </button>
      <pre ref={ref} className="overflow-auto rounded-md border bg-[#0d1117] p-3 text-xs leading-relaxed">{children}</pre>
    </div>
  );
}

function MdViewer({ path }: { path: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/' + encodeURI(path), { cache: 'no-store' }).then(r => r.text()).then(t => { if (alive) setText(t); }).catch(() => { if (alive) setText(''); });
    return () => { alive = false; };
  }, [path]);

  if (text === null) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch?.[1] ?? null;
  const body = frontmatter ? text.slice(fmMatch![0].length) : text;

  return (
    <div className="prose dark:prose-invert mx-auto max-w-3xl p-8 prose-headings:scroll-mt-4 prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
      {frontmatter && (
        <details className="not-prose mb-4 rounded border p-3 text-sm">
          <summary className="cursor-pointer font-medium">YAML frontmatter</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{frontmatter}</pre>
        </details>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkFrontmatter]}
        rehypePlugins={[
          rehypeRaw, rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['no-underline'] } }],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          [rehypeKatex, { strict: false }],
        ]}
        components={{ pre: ({ children }) => <CodeBlock>{children}</CodeBlock>, a: ({ href, children }) => {
          const ext = href?.startsWith('http');
          return <a href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noreferrer noopener' : undefined}>{children}</a>;
        } }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

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

  return (
    <div className={`border rounded-lg bg-background shadow-sm border-l-4 ${STATE_CLS[item.state] ?? ''}`}>
      <div className="flex items-center gap-2 px-3 pt-2.5 text-[11px] text-muted-foreground">
        {item.severity && <span className={`h-2 w-2 rounded-full ${SEV_COLOR[item.severity] ?? 'bg-muted-foreground'}`} />}
        <span className="font-medium">{item.category ?? '通用'}</span>
        {item.severity && <span className="uppercase">{SEV_TEXT[item.severity] ?? item.severity}</span>}
        <span className="ml-auto">{STATE_TEXT[item.state] ?? item.state}</span>
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
          <button onClick={() => post({ answer, state: 'answered' })} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-muted hover:bg-muted/70 text-xs">
            <Send className="h-3 w-3" />答复
          </button>
          <button onClick={() => post({ answer, state: 'accepted' })} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
            <Check className="h-3 w-3" />采纳
          </button>
          <button onClick={() => post({ answer, state: 'dismissed' })} className="inline-flex items-center gap-1 h-7 px-2.5 rounded bg-muted hover:bg-muted/70 text-xs">
            <X className="h-3 w-3" />驳回
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewViewer() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [doc, setDoc] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [filter, setFilter] = useState<ItemState | 'all'>('all');
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

  const pass = async () => {
    setErr('');
    const r = await fetch('/__review/status', { method: 'POST', headers: { 'x-stop-token': token, 'Content-Type': 'application/json' }, body: '{"status":"passed"}' });
    if (r.ok) setData(await r.json());
    else setErr((await r.json()).error ?? 'failed');
  };

  const items = (data?.items ?? [])
    .filter((i) => (doc ? (i.doc ?? '') === doc || !i.doc : true))
    .filter((i) => filter === 'all' || i.state === filter)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity ?? 'medium'] - ({ high: 0, medium: 1, low: 2 })[b.severity ?? 'medium']);

  return (
    <div className="flex h-full">
      <aside className="w-[240px] flex-none border-r bg-background overflow-auto">
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">文档</div>
        {docs.map(d => (
          <button key={d} onClick={() => setDoc(d)}
            className={`w-full text-left px-3 py-1.5 text-xs border-l-2 border-transparent hover:bg-muted ${doc === d ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}>
            {d}
          </button>
        ))}
        <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">评审项</div>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`w-full text-left px-3 py-1.5 text-xs border-l-2 border-transparent hover:bg-muted flex justify-between ${filter === f.key ? 'bg-muted font-medium border-primary text-foreground' : 'text-muted-foreground'}`}>
            <span>{f.label}</span><span className="font-mono text-[10px]">{counts[f.key]}</span>
          </button>
        ))}
      </aside>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-none flex items-center gap-2 px-3.5 border-b bg-background">
          {data && <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_BADGE[data.status] ?? ''}`}>{STATUS_TEXT[data.status] ?? data.status}</span>}
          <button onClick={pass} disabled={!data || data.status === 'passed' || counts.open > 0}
            className="ml-auto h-7 px-3 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs">
            通过
          </button>
        </div>
        {err && <div className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs px-3.5 py-1.5 border-b border-red-500/20">{err}</div>}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-h-0 overflow-auto border-r bg-background">
            {doc ? <MdViewer path={doc} /> : <p className="p-6 text-sm text-muted-foreground">左侧选择文档查看</p>}
          </div>
          <div className="w-[380px] flex-none overflow-auto p-3 flex flex-col gap-3" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
            {items.length === 0 && <p className="text-xs text-muted-foreground text-center pt-6">无评审项(换文档 / 状态筛选试试)</p>}
            {items.map((i) => <ItemCard key={i.id} item={i} token={token} onUpdated={setData} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
