import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Play, Square, RotateCw, Eraser, ArrowDown, Terminal } from 'lucide-react';
import { Button } from './ui/button';

interface Recipe { name: string; description: string; }
type JustState = 'idle' | 'running' | 'exited';
interface JustInfo { state: JustState; recipe: string | null; code: number | null; }

/** 无 ANSI 色码的行按日志级别着色(maven/构建工具在非 tty 下不输出颜色,前端补齐) */
function levelClass(t: string) {
  if (/^\[(ERROR|FATAL)\]/.test(t) || /^ERROR\b/.test(t)) return 'text-red-400';
  if (/^\[(WARN|WARNING)\]/.test(t) || /^WARN(ING)?\b/.test(t)) return 'text-amber-400';
  if (/^\[DEBUG\]/.test(t) || /^DEBUG\b/.test(t)) return 'text-sky-400';
  if (/^\[(INFO|DOWNLOAD|PROGRESS)\]/.test(t) || /^INFO\b/.test(t)) return 'text-emerald-400';
  return 'text-zinc-200';
}

export function LogViewer() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [info, setInfo] = useState<JustInfo>({ state: 'idle', recipe: null, code: null });
  const [lines, setLines] = useState<string[]>([]);
  const [pick, setPick] = useState('');
  const [follow, setFollow] = useState(true);
  const tokenRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/__just/recipes', { cache: 'no-store' }).then(r => r.json()).then((rs: Recipe[]) => {
      setRecipes(rs);
      if (rs[0]) setPick(rs[0].name);
    });
    fetch('/__config').then(r => r.json()).then(c => { tokenRef.current = c.stopToken ?? ''; });
    const es = new EventSource('/__just/logs');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === 'log') setLines(ls => { const next = [...ls, ev.text]; return next.length > 1000 ? next.slice(-1000) : next; });
        else if (ev.type === 'clear') setLines([]);
        else if (ev.type === 'state') setInfo({ state: ev.state, recipe: ev.recipe, code: ev.code });
      } catch { /* ignore */ }
    };
    es.onerror = () => { es.close(); };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (follow && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, follow]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const act = (action: 'start' | 'stop' | 'restart') => {
    const body = action === 'stop' ? '{}' : JSON.stringify({ recipe: pick });
    fetch(`/__just/${action}`, { method: 'POST', headers: { 'x-stop-token': tokenRef.current }, body })
      .then(r => r.json())
      .then((i: JustInfo) => setInfo(i))
      .catch((e) => console.error('[zdashboard] just action failed:', e));
    if (action !== 'stop') setFollow(true);
  };

  const running = info.state === 'running';
  const activeRecipe = running ? info.recipe : pick;
  const stateChip = running
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : info.state === 'exited' && info.code
      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
      : 'bg-muted text-muted-foreground border-border';
  const stateText = running ? `运行中` : info.state === 'exited' ? `已退出${info.code != null ? ` · code ${info.code}` : ''}` : '未运行';

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏：终端圆点 + recipe + 状态 */}
      <div className="flex-none flex items-center gap-2.5 px-3.5 h-11 border-b bg-background text-xs">
        <span className="flex items-center gap-1.5 flex-none">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        <Terminal className="h-3.5 w-3.5 text-muted-foreground flex-none" />
        <span className="font-mono truncate">just {activeRecipe ?? '—'}</span>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono flex-none ${stateChip}`}>{stateText}</span>
      </div>

      {/* 工具行 */}
      <div className="flex-none flex items-center gap-2 px-3.5 py-2 border-b bg-muted/40 text-xs">
        <select
          value={activeRecipe ?? ''}
          onChange={e => setPick(e.target.value)}
          disabled={running}
          className="h-7 min-w-0 max-w-[220px] rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:border-primary disabled:opacity-50"
        >
          {recipes.map(r => <option key={r.name} value={r.name}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1.5">
          {running ? (
            <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" onClick={() => act('stop')}><Square className="h-3 w-3" />停止</Button>
          ) : (
            <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => act('start')} disabled={!pick}><Play className="h-3 w-3" />启动</Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2.5 text-xs" onClick={() => act('restart')} disabled={!info.recipe && !pick}><RotateCw className="h-3 w-3" />重启</Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2.5 text-xs" onClick={() => setLines([])} disabled={!lines.length}><Eraser className="h-3 w-3" />清屏</Button>
        </div>
      </div>

      {/* 终端区（保持深色终端惯例） */}
      <div className="relative flex-1 min-h-0 bg-[#0d1117]">
        <div ref={scrollRef} onScroll={onScroll} className="absolute inset-0 overflow-auto p-3.5 font-mono text-xs leading-relaxed text-zinc-200">
          {lines.length === 0 && (
            <div className="text-zinc-500">
              <p><span className="text-emerald-400">$</span> just {pick || '<recipe>'}</p>
              <p className="mt-1.5">选择 recipe 点「启动」，日志会实时流到这里。</p>
            </div>
          )}
          {lines.map((l, i) => {
            const text = l.replace(/\r?\n$/, '');
            return (
              <div key={i} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
                {/\x1b\[/.test(text) ? <Ansi>{text}</Ansi> : <span className={levelClass(text)}>{text}</span>}
              </div>
            );
          })}
        </div>
        {!follow && (
          <button
            onClick={() => { setFollow(true); if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }}
            className="absolute bottom-3 right-4 z-10 flex items-center gap-1 px-2.5 h-7 rounded-full bg-zinc-700 text-white text-xs shadow-lg hover:bg-zinc-600 transition-colors"
          >
            <ArrowDown className="h-3 w-3" />回到底部
          </button>
        )}
      </div>

      {/* 底部状态条 */}
      <div className="flex-none flex items-center justify-between px-3.5 h-7 border-t bg-background text-[11px] text-muted-foreground font-mono">
        <span>{lines.length} 行{lines.length >= 1000 ? ' · 已截断' : ''}</span>
        <span>{follow ? '↓ 跟随输出' : '已暂停跟随'}</span>
      </div>
    </div>
  );
}
