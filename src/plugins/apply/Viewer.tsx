import { useEffect, useState, useCallback } from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChangeSummary {
  name: string;
  path: string;
  total: number;
  done: number;
  hasProposal: boolean;
  hasDesign: boolean;
}

interface ChangeDetail extends ChangeSummary {
  proposal?: string;
  design?: string;
  tasks: string;
}

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function StatusPill({ done, total }: { done: number; total: number }) {
  const p = pct(done, total);
  const cls =
    p === 100
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
      : p > 0
        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
        : 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${cls}`}>
      {done}/{total} · {p}%
    </span>
  );
}

function TaskList({ tasks }: { tasks: string }) {
  const lines = tasks.split('\n').filter((l) => l.trim().startsWith('- ['));
  if (!lines.length) return <p className="text-xs text-muted-foreground">无 tasks.md</p>;
  return (
    <ul className="space-y-1 text-xs">
      {lines.map((l, i) => {
        const checked = /- \[[xX]\]/.test(l);
        const text = l.replace(/^-\s*\[[ xX]\]\s*/, '');
        return (
          <li key={i} className={`flex items-start gap-2 ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
            {checked ? (
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">✓</span>
            ) : (
              <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/50" />
            )}
            <span>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeCard({ item, onSelect }: { item: ChangeSummary; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium font-mono truncate">{item.name}</span>
        <StatusPill done={item.done} total={item.total} />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className={item.hasProposal ? 'text-foreground' : ''}>proposal</span>
        <span className={item.hasDesign ? 'text-foreground' : ''}>design</span>
      </div>
    </button>
  );
}

export function ApplyViewer() {
  const [changes, setChanges] = useState<ChangeSummary[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChangeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setLoading(true);
    setSelectedName(null);
    setSelected(null);
    fetch('/__apply', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setChanges)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const select = useCallback((name: string) => {
    setLoading(true);
    setSelectedName(name);
    fetch(`/__apply/change?name=${encodeURIComponent(name)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then(setSelected)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !changes.length) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold animate-pulse">
            ⚙️
          </div>
          <p>加载执行进度…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-6xl flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <div className="flex-none px-4 py-3 border-b flex items-center gap-2">
        <span className="text-sm font-medium">OpenSpec 执行进度</span>
        <span className="ml-auto text-[11px] text-muted-foreground">openspec/changes/</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        {!changes.length ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">没有进行中的 change</p>
            <p className="text-xs mt-1">在 openspec/changes/ 下创建 change 后会显示在这里</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {changes.map((c) => (
              <ChangeCard
                key={c.name}
                item={c}
                onSelect={() => select(c.name)}
              />
            ))}
          </div>
        )}

        {selectedName && selected && !loading && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">{selected.name}</h3>
              <StatusPill done={selected.done} total={selected.total} />
            </div>
            {selected.proposal && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> proposal.md
                </h4>
                <div className="prose dark:prose-invert max-w-none text-xs border rounded-lg p-3 bg-card">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.proposal}</ReactMarkdown>
                </div>
              </div>
            )}
            {selected.design && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> design.md
                </h4>
                <div className="prose dark:prose-invert max-w-none text-xs border rounded-lg p-3 bg-card">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.design}</ReactMarkdown>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" /> tasks.md
              </h4>
              <div className="border rounded-lg p-3 bg-card">
                <TaskList tasks={selected.tasks} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ApplyViewer;
