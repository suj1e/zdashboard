import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Play, Square, RotateCw, X, Terminal, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface Recipe { name: string; description: string; }
type TaskStatus = 'running' | 'exited';
interface TaskState { state: TaskStatus; code: number | null; startedAt: number; }
type Ev =
  | { type: 'log'; recipe: string; text: string }
  | { type: 'clear'; recipe: string }
  | { type: 'state'; recipe: string; state: TaskStatus; code: number | null };

/** 无 ANSI 色码的行按日志级别着色(maven/构建工具在非 tty 下不输出颜色,前端补齐) */
function levelClass(t: string) {
  if (/^\[(ERROR|FATAL)\]/.test(t) || /^ERROR\b/.test(t)) return 'text-red-400';
  if (/^\[(WARN|WARNING)\]/.test(t) || /^WARN(ING)?\b/.test(t)) return 'text-amber-400';
  if (/^\[DEBUG\]/.test(t) || /^DEBUG\b/.test(t)) return 'text-sky-400';
  if (/^\[(INFO|DOWNLOAD|PROGRESS)\]/.test(t) || /^INFO\b/.test(t)) return 'text-emerald-400';
  return 'text-zinc-200';
}

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m${s % 60}s` : `${Math.floor(m / 60)}h${m % 60}m`;
}

/** 单张任务卡:头部(recipe/状态/时长/操作) + 独立日志流(跟随底部) */
function TaskCard({ recipe, task, lines, onStop, onRestart, onClose }: {
  recipe: string; task: TaskState; lines: string[];
  onStop: () => void; onRestart: () => void; onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const running = task.state === 'running';
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const dot = running
    ? 'bg-emerald-500 animate-pulse'
    : task.code
      ? 'bg-red-500'
      : 'bg-muted-foreground';
  const elapsed = running ? fmtElapsed(Date.now() - task.startedAt) : null;

  return (
    <div className="flex flex-col min-h-[220px] rounded-lg overflow-hidden border bg-background">
      <div className="flex-none flex items-center gap-2 px-3 h-9 border-b bg-muted/40 text-xs">
        <span className={`h-2 w-2 rounded-full flex-none ${dot}`} />
        <span className="font-mono font-medium truncate">{recipe}</span>
        {running
          ? <span className="text-muted-foreground flex-none">{elapsed}</span>
          : <span className={`flex-none font-mono ${task.code ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>exit {task.code}</span>}
        <span className="ml-auto flex items-center gap-0.5 flex-none">
          {running && <Button size="ghost" className="h-6 w-6 p-0" title="停止" onClick={onStop}><Square className="h-3 w-3" /></Button>}
          {!running && <Button size="ghost" className="h-6 w-6 p-0" title="重新运行" onClick={onRestart}><RotateCw className="h-3 w-3" /></Button>}
          <Button size="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" title="关闭卡片" onClick={onClose}><X className="h-3 w-3" /></Button>
        </span>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-zinc-200">
        {lines.length === 0 && <p className="text-zinc-500">等待输出…</p>}
        {lines.map((l, i) => {
          const text = l.replace(/\r?\n$/, '');
          return (
            <div key={i} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
              {/\x1b\[/.test(text) ? <Ansi>{text}</Ansi> : <span className={levelClass(text)}>{text}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LogViewer() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const tokenRef = useRef('');
  const [, forceTick] = useState(0);

  useEffect(() => {
    fetch('/__just/recipes', { cache: 'no-store' }).then(r => r.json()).then(setRecipes).catch(() => setRecipes([]));
    fetch('/__config').then(r => r.json()).then(c => { tokenRef.current = c.stopToken ?? ''; }).catch(() => {});
    const es = new EventSource('/__just/logs');
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as Ev;
        if (ev.type === 'log') {
          setLogs(prev => {
            const next = [...(prev[ev.recipe] ?? []), ev.text];
            return { ...prev, [ev.recipe]: next.length > 1000 ? next.slice(-1000) : next };
          });
        } else if (ev.type === 'clear') {
          setLogs(prev => ({ ...prev, [ev.recipe]: [] }));
        } else if (ev.type === 'state') {
          setTasks(prev => ({
            ...prev,
            [ev.recipe]: { state: ev.state, code: ev.code, startedAt: prev[ev.recipe]?.startedAt ?? Date.now() },
          }));
          setClosed(prev => { const n = new Set(prev); n.delete(ev.recipe); return n; }); // 重新出现的任务自动恢复卡片
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { es.close(); };
    // 运行中任务的时长计时刷新
    const timer = setInterval(() => forceTick(t => t + 1), 1000);
    return () => { es.close(); clearInterval(timer); };
  }, []);

  const act = (action: 'start' | 'stop' | 'restart', recipe?: string) => {
    fetch(`/__just/${action}`, {
      method: 'POST',
      headers: { 'x-stop-token': tokenRef.current, 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe ? { recipe } : {}),
    }).catch((e) => console.error('[zdashboard] just action failed:', e));
  };

  const running = Object.entries(tasks).filter(([, t]) => t.state === 'running');
  const exited = Object.entries(tasks).filter(([, t]) => t.state === 'exited');
  const visibleCards = Object.entries(tasks)
    .filter(([name]) => !closed.has(name))
    .sort(([a, ta], [b, tb]) => (ta.state === tb.state ? (tb.startedAt ?? 0) - (ta.startedAt ?? 0) : ta.state === 'running' ? -1 : 1)); // 运行中在前
  const cols = visibleCards.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="h-full flex flex-col">
      {/* 顶部:全部 recipe pills(启停入口;运行中绿色呼吸点,点击即停) */}
      <div className="flex-none flex items-center gap-1.5 flex-wrap px-3.5 py-2.5 border-b bg-background">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground flex-none mr-0.5" />
        {recipes.map(r => {
          const t = tasks[r.name];
          const isRunning = t?.state === 'running';
          const hasExited = t?.state === 'exited';
          return (
            <button
              key={r.name}
              onClick={() => act(isRunning ? 'stop' : 'start', r.name)}
              title={r.description ? `${r.name} — ${r.description}` : r.name}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-mono transition-colors
                ${isRunning
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : hasExited
                    ? 'border-border bg-muted/60 text-foreground hover:bg-muted'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'}`}
            >
              {isRunning && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {r.name}
            </button>
          );
        })}
        {exited.length > 0 && (
          <Button
            size="ghost" className="h-7 gap-1 px-2 ml-auto text-xs text-muted-foreground"
            onClick={() => setClosed(new Set(exited.map(([n]) => n)))}
            title="收起全部已退出的任务卡片"
          >
            <Trash2 className="h-3 w-3" />清已完成
          </Button>
        )}
      </div>

      {/* 任务卡片网格:并行任务并行可见 */}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        {visibleCards.length === 0 ? (
          <div className="h-full grid place-items-center text-muted-foreground">
            <div className="text-center">
              <Terminal className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">点击上方 recipe 启动任务</p>
              <p className="mt-1 text-xs">可同时运行多个任务，每个任务一张卡片</p>
            </div>
          </div>
        ) : (
          <div className={`grid gap-3 h-full ${cols}`}>
            {visibleCards.map(([name, t]) => (
              <TaskCard
                key={name}
                recipe={name}
                task={t}
                lines={logs[name] ?? []}
                onStop={() => act('stop', name)}
                onRestart={() => act('start', name)}
                onClose={() => setClosed(prev => new Set(prev).add(name))}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部状态条 */}
      <div className="flex-none flex items-center justify-between px-3.5 h-7 border-t bg-background text-[11px] text-muted-foreground font-mono">
        <span>{recipes.length} recipes</span>
        <span>{running.length} 运行中{exited.length ? ` · ${exited.length} 已退出` : ''}</span>
      </div>
    </div>
  );
}
