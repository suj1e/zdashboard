import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Play, Square, RotateCw, Eraser, ArrowDown } from 'lucide-react';
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

  const stateDot = info.state === 'running' ? 'bg-green-500' : info.state === 'exited' && info.code ? 'bg-red-500' : 'bg-muted-foreground';
  const stateText = info.state === 'running' ? `运行中 · ${info.recipe ?? ''}` : info.state === 'exited' ? `已退出${info.code != null ? ` (code ${info.code})` : ''}` : '未运行';

  return (
    <div className="h-full flex flex-col bg-[#0d1117] rounded-lg border overflow-hidden">
      <div className="flex-none flex items-center gap-2 px-3 h-11 border-b border-white/10 text-xs text-zinc-300">
        <span className={`h-2 w-2 rounded-full flex-none ${stateDot}`} />
        <span className="text-zinc-400 truncate">{stateText}</span>
        <select
          value={info.recipe && info.state === 'running' ? info.recipe : pick}
          onChange={e => setPick(e.target.value)}
          disabled={info.state === 'running'}
          className="h-7 rounded bg-white/5 border border-white/15 px-1.5 text-zinc-200 focus:outline-none disabled:opacity-50"
        >
          {recipes.map(r => <option key={r.name} value={r.name} className="bg-[#161b22]">{r.name}{r.description ? ` — ${r.description}` : ''}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1.5">
          {info.state === 'running' ? (
            <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" onClick={() => act('stop')}><Square className="h-3 w-3" />停止</Button>
          ) : (
            <Button size="sm" variant="secondary" className="h-7 gap-1 px-2.5 text-xs" onClick={() => act('start')} disabled={!pick}><Play className="h-3 w-3" />启动</Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-white/10" onClick={() => act('restart')} disabled={!info.recipe && !pick}><RotateCw className="h-3 w-3" />重启</Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-white/10" onClick={() => setLines([])}><Eraser className="h-3 w-3" />清屏</Button>
        </div>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-auto p-3 font-mono text-xs leading-relaxed text-zinc-200">
        {lines.length === 0 && <p className="text-zinc-500">选择 recipe 点「启动」,日志会实时流到这里。</p>}
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
          className="absolute bottom-16 right-8 z-10 flex items-center gap-1 px-2.5 h-7 rounded-full bg-zinc-700 text-white text-xs shadow-lg hover:bg-zinc-600"
        >
          <ArrowDown className="h-3 w-3" />回到底部
        </button>
      )}
    </div>
  );
}
