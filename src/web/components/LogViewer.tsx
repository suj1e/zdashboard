import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Play, Square, RotateCw, Terminal } from 'lucide-react';
import { Button } from './ui/button';

interface Recipe { name: string; description: string; }
type TaskStatus = 'running' | 'exited';
interface TaskState { state: TaskStatus; code: number | null; startedAt: number; signal?: string; }
type Ev =
  | { type: 'log'; recipe: string; text: string }
  | { type: 'clear'; recipe: string }
  | { type: 'state'; recipe: string; state: TaskStatus; code: number | null; startedAt?: number; signal?: string };

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

export function LogViewer() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const tokenRef = useRef('');
  const [, forceTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selLines = selected ? logs[selected] ?? [] : [];

  useEffect(() => {
    fetch('/__just/recipes', { cache: 'no-store' }).then(r => r.json()).then(setRecipes).catch(() => setRecipes([]));
    fetch('/__config').then(r => r.json()).then(c => { tokenRef.current = c.stopToken ?? ''; }).catch(() => {});
    const es = new EventSource('/__just/logs');
    let firstOpen = true;
    es.onopen = () => {
      if (firstOpen) { firstOpen = false; return; }
      // 重连:清空本地状态,靠服务端 subscribe 重放重建快照(避免日志重复追加)
      setLogs({});
      setTasks({});
    };
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
            [ev.recipe]: { state: ev.state, code: ev.code, signal: ev.signal, startedAt: ev.startedAt ?? prev[ev.recipe]?.startedAt ?? Date.now() },
          }));
          if (ev.state === 'running') setSelected(ev.recipe); // 新任务自动聚焦
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* EventSource 自动重连,onopen 里处理重放去重 */ };
    const timer = setInterval(() => forceTick(t => t + 1), 1000);
    return () => { es.close(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selLines.length, selected]);

  const act = (action: 'start' | 'stop', recipe: string) => {
    fetch(`/__just/${action}`, {
      method: 'POST',
      headers: { 'x-stop-token': tokenRef.current, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe }),
    }).catch((e) => console.error('[zdashboard] just action failed:', e));
  };

  const rows = recipes.map(r => ({ ...r, task: tasks[r.name] }));
  const runningCount = rows.filter(r => r.task?.state === 'running').length;
  const selTask = selected ? tasks[selected] : undefined;
  const selRunning = selTask?.state === 'running';

  return (
    <div className="h-full flex flex-col">
      {/* ── 总控台:全部任务状态一览 + 启停控制;点击行聚焦日志 ── */}
      <div className="flex-none border-b bg-background">
        <div className="flex items-center gap-2 px-3.5 h-9 border-b bg-muted/40 text-[11px] text-muted-foreground">
          <Terminal className="h-3 w-3" />
          <span className="font-medium">总控台</span>
          <span className="ml-auto font-mono">{runningCount} 运行 / {rows.length} 任务</span>
        </div>
        <div className="max-h-[38%] overflow-auto">
          {rows.length === 0 && <p className="px-3.5 py-3 text-xs text-muted-foreground">未发现 justfile recipes</p>}
          {rows.map(r => {
            const t = r.task;
            const running = t?.state === 'running';
            const exited = t?.state === 'exited';
            const isSel = selected === r.name;
            return (
              <div
                key={r.name}
                onClick={() => setSelected(r.name)}
                title={r.description || undefined}
                className={`flex items-center gap-2.5 px-3.5 h-10 border-l-2 cursor-pointer text-xs
                  ${isSel ? 'bg-muted border-primary' : 'border-transparent hover:bg-muted/50'}`}
              >
                <span className={`h-2 w-2 rounded-full flex-none
                  ${running ? 'bg-emerald-500 animate-pulse' : exited ? (t.signal ? 'bg-muted-foreground' : t.code ? 'bg-red-500' : 'bg-emerald-500/60') : 'bg-muted-foreground/30'}`} />
                <span className="font-mono font-medium flex-none">{r.name}</span>
                {running && <span className="text-emerald-600 dark:text-emerald-400 flex-none font-mono">{fmtElapsed(Date.now() - t.startedAt)}</span>}
                {exited && (
                  <span className={`flex-none font-mono ${t.signal ? 'text-muted-foreground' : t.code ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {t.signal ? '已停止' : `exit ${t.code}`}
                  </span>
                )}
                {!t && <span className="text-muted-foreground/60 flex-none">未运行</span>}
                {r.description && <span className="truncate text-muted-foreground/70 hidden lg:inline">{r.description}</span>}
                <span className="ml-auto flex items-center gap-1 flex-none" onClick={e => e.stopPropagation()}>
                  {running ? (
                    <Button size="ghost" className="h-6 gap-1 px-2 text-[11px]" onClick={() => act('stop', r.name)}><Square className="h-2.5 w-2.5" />停止</Button>
                  ) : (
                    <Button size="ghost" className="h-6 gap-1 px-2 text-[11px]" onClick={() => act('start', r.name)}>
                      {exited ? <RotateCw className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}{exited ? '重跑' : '启动'}
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 聚焦日志区:当前选中任务的实时输出 ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {selected ? (
          <>
            <div className="flex-none flex items-center gap-2 px-3.5 h-8 border-b bg-background text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${selRunning ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="font-mono font-medium">{selected}</span>
              <span className="text-muted-foreground font-mono">
                {selRunning ? `running · ${fmtElapsed(Date.now() - selTask.startedAt)}` : selTask?.signal ? '已停止' : selTask ? `exit ${selTask.code}` : ''}
              </span>
              <span className="ml-auto text-muted-foreground font-mono">{selLines.length} 行</span>
            </div>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-[#0d1117] p-3.5 font-mono text-xs leading-relaxed text-zinc-200">
              {selLines.length === 0 && <p className="text-zinc-500">$ just {selected} · 等待输出…</p>}
              {selLines.map((l, i) => {
                const text = l.replace(/\r?\n$/, '');
                return (
                  <div key={i} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
                    {/\x1b\[/.test(text) ? <Ansi>{text}</Ansi> : <span className={levelClass(text)}>{text}</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center bg-[#0d1117] text-zinc-500 font-mono text-xs">
            <div className="text-center">
              <p>$ just &lt;recipe&gt;</p>
              <p className="mt-2">在总控台选择或启动一个任务，日志会流到这里</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
