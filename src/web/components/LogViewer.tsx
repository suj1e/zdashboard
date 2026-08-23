import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Button } from './ui/button';
import { FilterPills, type FilterItem } from './FilterPills.js';
import { toast } from 'sonner';
import { intervalToDuration } from 'date-fns';
import { useIcons } from '../lib/icons.js';

interface Recipe { name: string; description: string; }
type TaskStatus = 'running' | 'exited';
interface TaskState { state: TaskStatus; code: number | null; startedAt: number; signal?: string; }
type Ev =
  | { type: 'log'; recipe: string; text: string }
  | { type: 'clear'; recipe: string }
  | { type: 'state'; recipe: string; state: TaskStatus; code: number | null; startedAt?: number; signal?: string };

/** 无 ANSI 色码的行按日志级别着色(maven/构建工具在非 tty 下不输出颜色,前端补齐) */
function levelClass(t: string) {
  if (/^\[(ERROR|FATAL)\]/.test(t) || /^ERROR\b/.test(t)) return 'text-destructive';
  if (/^\[(WARN|WARNING)\]/.test(t) || /^WARN(ING)?\b/.test(t)) return 'text-warning';
  if (/^\[DEBUG\]/.test(t) || /^DEBUG\b/.test(t)) return 'text-info';
  if (/^\[(INFO|DOWNLOAD|PROGRESS)\]/.test(t) || /^INFO\b/.test(t)) return 'text-success';
  return 'text-terminal-fg';
}

function fmtElapsed(ms: number) {
  const d = intervalToDuration({ start: 0, end: ms });
  const h = d.hours ?? 0;
  const m = d.minutes ?? 0;
  const s = d.seconds ?? 0;
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m${s}s`;
  return `${h}h${m}m`;
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
  const { icon } = useIcons();

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

  const act = (action: 'start' | 'stop' | 'clear', recipe: string) => {
    fetch(`/__just/${action}`, {
      method: 'POST',
      headers: { 'x-stop-token': tokenRef.current, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe }),
    }).catch(() => toast.error(`just ${action} 动作失败`));
  };

  // selected=null → 总控台视图;string → 聚焦该任务
  const rows = recipes.map(r => ({ ...r, task: tasks[r.name] }));
  const runningCount = rows.filter(r => r.task?.state === 'running').length;
  const selTask = selected ? tasks[selected] : undefined;
  const selRunning = selTask?.state === 'running';

  const pill = (running: boolean, exited: boolean, t?: TaskState) =>
    running ? 'bg-success animate-pulse'
    : exited ? (t?.signal ? 'bg-muted-foreground' : t?.code ? 'bg-destructive' : 'bg-success/60')
    : 'bg-muted-foreground/30';

  const consoleItem: FilterItem = {
    key: '__console__',
    label: '总控台',
    badge: <span className="font-mono opacity-80">{runningCount > 0 ? runningCount : ''}</span>,
    className: selected === null ? '' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40',
    renderLabel: () => (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3">{icon('monitor', 'h-3 w-3')}</span>
        <span>总控台</span>
      </span>
    ),
  };

  const recipeItems: FilterItem[] = recipes.map(r => {
    const t = tasks[r.name];
    const running = t?.state === 'running';
    const exited = t?.state === 'exited';
    const isSel = selected === r.name;
    return {
      key: r.name,
      label: r.name,
      className: isSel ? '' : running ? 'border-success/40 bg-success/10 text-success hover:bg-success/20' : '',
      renderLabel: () => (
        <>
          <span className={`h-1.5 w-1.5 rounded-[var(--radius-full)] ${pill(running, exited, t)}`} />
          <span>{r.name}</span>
        </>
      ),
      renderExtra: () => exited && !isSel ? (
        <span className={`text-xs ${t?.signal ? 'opacity-60' : t?.code ? 'text-destructive' : 'text-success'}`}>
          {t?.signal ? '停' : t?.code}
        </span>
      ) : undefined,
    };
  });

  return (
    <div className="h-full flex flex-col">
      {/* ── 药丸行:总控台 + 全部任务,横铺 ── */}
      <div className="flex-none flex items-center gap-1.5 flex-wrap px-3 py-2 border-b bg-background">
        <FilterPills
          items={[consoleItem, ...recipeItems]}
          value={selected ?? '__console__'}
          onChange={(v) => setSelected(v === '__console__' ? null : v)}
          ariaLabel="任务筛选"
        />
      </div>

      {/* ── 内容区 ── */}
      {selected === null ? (
        /* 总控台视图:每任务一张紧凑卡(状态/时长/启停/日志尾预览) */
        <div className="flex-1 min-h-0 overflow-auto p-3 grid gap-2.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 content-start">
          {rows.length === 0 && <p className="text-xs text-muted-foreground col-span-full p-4 text-center">未发现 justfile recipes</p>}
          {rows.map(r => {
            const t = r.task;
            const running = t?.state === 'running';
            const exited = t?.state === 'exited';
            const tail = (logs[r.name] ?? []).slice(-3).map(l => l.replace(/\r?\n$/, '').replace(/\x1b\[[0-9;]*m/g, ''));
            return (
              <div key={r.name} onClick={() => setSelected(r.name)}
                className="group rounded-[var(--radius-lg)] border bg-card p-3 cursor-pointer hover:border-muted-foreground/40 transition-colors">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-[var(--radius-full)] flex-none ${pill(running, exited, t)}`} />
                  <span className="font-mono font-medium">{r.name}</span>
                  {running && <span className="text-success font-mono">{fmtElapsed(Date.now() - t.startedAt)}</span>}
                  {exited && <span className={`font-mono ${t.signal ? 'text-muted-foreground' : t.code ? 'text-destructive' : 'text-success'}`}>{t.signal ? '已停止' : `exit ${t.code}`}</span>}
                  {!t && <span className="text-muted-foreground/60">未运行</span>}
                  <span className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {running ? (
                      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('stop', r.name)}>{icon('square', 'h-2.5 w-2.5')}停止</Button>
                    ) : (
                      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('start', r.name)}>
                        {exited ? icon('rotate-cw', 'h-2.5 w-2.5') : icon('play', 'h-2.5 w-2.5')}{exited ? '重跑' : '启动'}
                      </Button>
                    )}
                  </span>
                </div>
                {r.description && <p className="mt-1 text-sm text-muted-foreground/70 truncate">{r.description}</p>}
                <div className="mt-2 rounded bg-terminal-bg px-2 py-1.5 font-mono text-xs leading-relaxed text-terminal-fg/70 min-h-[3.4em]">
                  {tail.length ? tail.map((l, i) => <div key={i} className="truncate">{l}</div>) : <span className="text-terminal-fg/40">$ just {r.name} …</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 单任务视图:状态头 + 完整日志流 */
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-none flex items-center gap-2 px-3.5 h-8 border-b bg-background text-sm">
            <span className={`h-1.5 w-1.5 rounded-[var(--radius-full)] ${selRunning ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="font-mono font-medium">{selected}</span>
            <span className="text-muted-foreground font-mono">
              {selRunning ? `running · ${fmtElapsed(Date.now() - selTask.startedAt)}` : selTask?.signal ? '已停止' : selTask ? `exit ${selTask.code}` : '未运行'}
            </span>
            <span className="ml-auto flex items-center gap-1">
              {selRunning
                ? <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('stop', selected)}>{icon('square', 'h-2.5 w-2.5')}停止</Button>
                : <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('start', selected)}>{icon('rotate-cw', 'h-2.5 w-2.5')}{selTask ? '重跑' : '启动'}</Button>}
              <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('clear', selected)} disabled={!selLines.length}>{icon('eraser', 'h-2.5 w-2.5')}清屏</Button>
              <span className="text-muted-foreground font-mono ml-1">{selLines.length} 行</span>
            </span>
          </div>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-terminal-bg p-3.5 font-mono text-xs leading-relaxed text-terminal-fg">
            {selLines.length === 0 && <p className="text-terminal-fg/50">$ just {selected} · 等待输出…</p>}
            {selLines.map((l, i) => {
              const text = l.replace(/\r?\n$/, '');
              return (
                <div key={i} className="whitespace-pre-wrap break-all min-h-[1.25rem]">
                  {/\x1b\[/.test(text) ? <Ansi>{text}</Ansi> : <span className={levelClass(text)}>{text}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
