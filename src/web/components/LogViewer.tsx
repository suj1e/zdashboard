import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { FilterPills, type FilterItem } from './FilterPills.js';
import { toast } from 'sonner';
import { intervalToDuration } from 'date-fns';
import { useIcons } from '../lib/icons.js';
import { usePluginData } from '../hooks/usePluginData.js';
import { fetchJson } from '../lib/fetchJson.js';
import { isAtBottom, levelClass, MAX_LOG_LINES } from '../lib/log-viewer.js';
import { LogLine, type LogLineData } from './log-lines.js';
import { EmptyState, ErrorState, Skeleton } from '../kit/index.js';

interface Recipe { name: string; description: string; params?: string[]; }
type TaskStatus = 'running' | 'exited';
interface TaskState { state: TaskStatus; code: number | null; startedAt: number; signal?: string; }
type Ev =
  | { type: 'log'; recipe: string; text: string }
  | { type: 'clear'; recipe: string }
  | { type: 'state'; recipe: string; state: TaskStatus; code: number | null; startedAt?: number; signal?: string };

interface LogViewerProps {
  /** 受控选中 recipe(URL 驱动);缺省时组件内部自治(兼容独立使用) */
  selected?: string | null;
  onSelect?: (recipe: string | null) => void;
}

/** 级别过滤 pill:key 与 levelClass 输出对齐(识别单源),all 表示不过滤 */
const LEVEL_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'text-info', label: '信息' },
  { key: 'text-warning', label: '警告' },
  { key: 'text-destructive', label: '错误' },
  { key: 'text-success', label: '成功' },
];

/** 动作中文名(toast 文案) */
const ACTION_LABEL = { start: '启动', stop: '停止', clear: '清屏' } as const;
/** pending 解禁兜底:SSE state 事件迟迟不到时按超时放开按钮 */
const PENDING_TIMEOUT_MS = 3000;

function fmtElapsed(ms: number) {
  const d = intervalToDuration({ start: 0, end: ms });
  const h = d.hours ?? 0;
  const m = d.minutes ?? 0;
  const s = d.seconds ?? 0;
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}m${s}s`;
  return `${h}h${m}m`;
}

/** 运行时长徽标:每秒 tick 收敛在本组件内,日志列表不参与重渲 */
function ElapsedBadge({ startedAt, className }: { startedAt: number; className?: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className={className}>{fmtElapsed(Math.max(0, Date.now() - startedAt))}</span>;
}

/** 带参启动面板:动态字段(placeholder=参数名),确认后携带 args 启动 */
function ParamsForm({ params, values, onChange, onSubmit, onCancel }: {
  params: string[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      data-testid="param-panel"
      onClick={(e) => e.stopPropagation()}
      className="flex flex-wrap items-center gap-2 px-3.5 py-2 border-b bg-card text-sm"
    >
      {params.map(p => (
        <label key={p} className="inline-flex items-center gap-1 text-xs">
          <span className="font-mono text-muted-foreground">{p}</span>
          <input
            aria-label={p}
            placeholder={p}
            value={values[p] ?? ''}
            onChange={(e) => onChange(p, e.target.value)}
            className="h-6 w-32 rounded-[var(--radius-md)] border bg-transparent px-1.5 font-mono outline-none placeholder:text-muted-foreground/50 focus:border-muted-foreground/50"
          />
        </label>
      ))}
      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm text-success" onClick={onSubmit}>{'启动'}</Button>
      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={onCancel}>{'取消'}</Button>
    </div>
  );
}

export function LogViewer({ selected: selectedProp, onSelect }: LogViewerProps) {
  const controlled = typeof onSelect === 'function';
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = controlled ? selectedProp ?? null : internalSelected;
  const setSelected = (r: string | null) => {
    if (controlled) onSelect(r);
    else setInternalSelected(r);
  };
  const recipes = usePluginData<Recipe[]>('just:/__just/recipes', () =>
    fetchJson<Recipe[]>('/__just/recipes', { cache: 'no-store' }), { subscribe: 'plugin:just:state' });
  const recipeList = recipes.data ?? [];
  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const [logs, setLogs] = useState<Record<string, LogLineData[]>>({});
  const tokenRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const selLines = selected ? logs[selected] ?? [] : [];
  const { icon } = useIcons();

  // ── 滚动锚定:atBottom(距底 <40px)才自动跟随;离开底部累计未读行数,回底清零 ──
  const atBottomRef = useRef(true);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; });

  // ── 渲染合批:log 事件进 pending,rAF(降级 50ms timer)一帧一落;seq 单调递增随行存入 ──
  const pendingRef = useRef(new Map<string, string[]>());
  const seqRef = useRef(0);
  const flushScheduledRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const flush = () => {
      flushScheduledRef.current = false;
      const batch = pendingRef.current;
      if (batch.size === 0) return;
      pendingRef.current = new Map();
      const appended = new Map<string, LogLineData[]>();
      for (const [recipe, texts] of batch) {
        appended.set(recipe, texts.map(t => ({ seq: ++seqRef.current, text: t })));
      }
      setLogs(prev => {
        const next = { ...prev };
        for (const [recipe, lines] of appended) {
          const merged = (next[recipe] ?? []).concat(lines);
          next[recipe] = merged.length > MAX_LOG_LINES ? merged.slice(-MAX_LOG_LINES) : merged;
        }
        return next;
      });
      // 未读计数:仅当前选中任务的新增行;在底部则跟随并保持零
      const sel = selectedRef.current;
      const n = sel ? appended.get(sel)?.length ?? 0 : 0;
      if (n > 0) {
        const el = scrollRef.current;
        const at = !el || isAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
        if (at) atBottomRef.current = true;
        else unreadRef.current += n;
        setUnread(unreadRef.current);
      }
    };
    flushRef.current = flush;
    const done = () => {
      if (!flushScheduledRef.current) return; // 另一路(帧/兜底)已触发
      flushScheduledRef.current = false;
      if (fallbackTimerRef.current !== null) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
      flush();
    };
    const schedule = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      // rAF 随帧落地;50ms timer 并行兜底(后台 tab rAF 暂停时输出仍会落地),先到先得
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(done);
      fallbackTimerRef.current = setTimeout(done, 50);
    };
    fetch('/__config').then(r => r.json()).then(c => { tokenRef.current = c.stopToken ?? ''; }).catch(() => {});
    const es = new EventSource('/__just/logs');
    let firstOpen = true;
    es.onopen = () => {
      if (firstOpen) { firstOpen = false; return; }
      // 重连:清空本地状态,靠服务端 subscribe 重放重建快照(避免日志重复追加)
      pendingRef.current.clear();
      setLogs({});
      setTasks({});
    };
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as Ev;
        if (ev.type === 'log') {
          const arr = pendingRef.current.get(ev.recipe);
          if (arr) arr.push(ev.text);
          else pendingRef.current.set(ev.recipe, [ev.text]);
          schedule();
        } else if (ev.type === 'clear') {
          pendingRef.current.delete(ev.recipe); // 先撤 pending,避免 clear 后残留批量复活旧日志
          setLogs(prev => ({ ...prev, [ev.recipe]: [] }));
        } else if (ev.type === 'state') {
          setTasks(prev => ({
            ...prev,
            [ev.recipe]: { state: ev.state, code: ev.code, signal: ev.signal, startedAt: ev.startedAt ?? prev[ev.recipe]?.startedAt ?? Date.now() },
          }));
          // 该任务启停的确认信号到达:解除按钮 pending
          setPending(p => (p[ev.recipe] ? { ...p, [ev.recipe]: undefined } : p));
          // 新任务自动聚焦:仅非受控模式(URL 驱动时不擅自改 URL)
          if (ev.state === 'running' && !controlled) setSelected(ev.recipe);
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* EventSource 自动重连,onopen 里处理重放去重 */ };
    return () => {
      es.close();
      if (fallbackTimerRef.current !== null) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
      flushScheduledRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动跟随:仅在底部时拽底;切换任务强制回底并清未读
  const prevSelectedRef = useRef(selected);
  useEffect(() => {
    const el = scrollRef.current;
    const switched = prevSelectedRef.current !== selected;
    prevSelectedRef.current = selected;
    if (!el) return;
    const at = isAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    atBottomRef.current = at;
    if (at || switched) {
      el.scrollTop = el.scrollHeight;
      atBottomRef.current = true;
      if (unreadRef.current !== 0) { unreadRef.current = 0; setUnread(0); }
    }
  }, [selLines.length, selected]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const at = isAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    atBottomRef.current = at;
    if (at && unreadRef.current !== 0) { unreadRef.current = 0; setUnread(0); }
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottomRef.current = true;
    unreadRef.current = 0;
    setUnread(0);
  };

  // ── 搜索(防抖 150ms)与级别过滤:渲染层派生,不改存储 ──
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(queryInput), 150);
    return () => clearTimeout(t);
  }, [queryInput]);
  const [levelFilter, setLevelFilter] = useState('all');
  const visibleLines = useMemo(() => {
    let ls = selLines;
    if (levelFilter !== 'all') ls = ls.filter(l => levelClass(l.text.replace(/\r?\n$/, '')) === levelFilter);
    if (query) {
      const q = query.toLowerCase();
      ls = ls.filter(l => l.text.toLowerCase().includes(q));
    }
    return ls;
  }, [selLines, levelFilter, query]);

  // ── 启停反馈:按钮 pending(recipe 维度),持续到 SSE state 事件到达或 3s 超时 ──
  const [pending, setPending] = useState<Record<string, 'start' | 'stop' | undefined>>({});
  const clearPending = (recipe: string) => setPending(p => (p[recipe] ? { ...p, [recipe]: undefined } : p));

  const act = async (action: 'start' | 'stop' | 'clear', recipe: string, args?: Record<string, string>) => {
    if (action !== 'clear') setPending(p => ({ ...p, [recipe]: action }));
    try {
      const res = await fetch(`/__just/${action}`, {
        method: 'POST',
        headers: { 'x-stop-token': tokenRef.current, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, ...(action === 'start' && args ? { args } : {}) }),
      });
      if (!res.ok) {
        let detail = '';
        try {
          const body = (await res.json()) as { error?: unknown };
          if (typeof body?.error === 'string' && body.error) detail = `:${body.error}`;
        } catch { /* body 非 JSON → 用状态码兜底文案 */ }
        toast.error(`just ${recipe} ${ACTION_LABEL[action]}失败${detail || `(HTTP ${res.status})`}`);
        if (action !== 'clear') clearPending(recipe);
        return false;
      }
      if (action === 'clear') { toast.success(`已清屏 ${recipe}`); return true; }
      // start/stop 成功:等 SSE state 事件解禁;3s 超时兜底
      setTimeout(() => clearPending(recipe), PENDING_TIMEOUT_MS);
      toast.success(action === 'start' ? `已启动 ${recipe}` : `已停止 ${recipe}`);
      return true;
    } catch {
      toast.error(`just ${recipe} ${ACTION_LABEL[action]}失败:网络异常`);
      if (action !== 'clear') clearPending(recipe);
      return false;
    }
  };

  // selected=null → 总控台视图;string → 聚焦该任务
  const rows = recipeList.map(r => ({ ...r, task: tasks[r.name] }));
  const runningCount = rows.filter(r => r.task?.state === 'running').length;
  const selTask = selected ? tasks[selected] : undefined;
  const selRunning = selTask?.state === 'running';

  // ── 带参启动:带参 recipe 先弹参数面板,确认后携带 args 启动;无参直接启动 ──
  const [paramTarget, setParamTarget] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const startRecipe = (name: string) => {
    const p = recipeList.find(r => r.name === name)?.params ?? [];
    if (p.length === 0) { void act('start', name); return; }
    setParamValues(Object.fromEntries(p.map(k => [k, ''])));
    setParamTarget(name);
  };
  const submitParams = () => {
    if (!paramTarget) return;
    const entries = Object.entries(paramValues).filter(([, v]) => v !== '');
    void act('start', paramTarget, entries.length > 0 ? Object.fromEntries(entries) : undefined);
    setParamTarget(null);
    setParamValues({});
  };
  const cancelParams = () => { setParamTarget(null); setParamValues({}); };
  const paramPanel = (recipe: string) => paramTarget === recipe ? (
    <ParamsForm
      params={recipeList.find(r => r.name === recipe)?.params ?? []}
      values={paramValues}
      onChange={(k, v) => setParamValues(prev => ({ ...prev, [k]: v }))}
      onSubmit={submitParams}
      onCancel={cancelParams}
    />
  ) : null;

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

  const recipeItems: FilterItem[] = recipeList.map(r => {
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
        /* 总控台视图:recipes 三态(加载/错误/空),有数据才渲染任务卡;
           骨架仅初始加载(loading && 无数据),SSE state 事件后台重取静默,任务卡不卸载 */
        <div className="flex-1 min-h-0 flex flex-col">
          {recipes.loading && !recipes.data ? (
            <Skeleton rows={4} className="m-3" />
          ) : recipes.error ? (
            <ErrorState message={recipes.error} onRetry={recipes.reload} />
          ) : rows.length === 0 ? (
            <EmptyState title="未发现 justfile recipes" hint="在项目根目录放置 justfile,即可在这里查看与启停任务" />
          ) : (
            <div className="flex-1 min-h-0 overflow-auto p-3 grid gap-2.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 content-start">
              {rows.map(r => {
            const t = r.task;
            const running = t?.state === 'running';
            const exited = t?.state === 'exited';
            const tail = (logs[r.name] ?? []).slice(-3).map(l => l.text.replace(/\r?\n$/, '').replace(/\x1b\[[0-9;]*m/g, ''));
            return (
              <div key={r.name} onClick={() => setSelected(r.name)}
                className="group rounded-[var(--radius-lg)] border bg-card p-3 cursor-pointer hover:border-muted-foreground/40 transition-colors">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-[var(--radius-full)] flex-none ${pill(running, exited, t)}`} />
                  <span className="font-mono font-medium">{r.name}</span>
                  {running && <ElapsedBadge startedAt={t.startedAt} className="text-success font-mono" />}
                  {exited && <span className={`font-mono ${t.signal ? 'text-muted-foreground' : t.code ? 'text-destructive' : 'text-success'}`}>{t.signal ? '已停止' : `exit ${t.code}`}</span>}
                  {!t && <span className="text-muted-foreground/60">未运行</span>}
                  <span className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {running ? (
                      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" disabled={!!pending[r.name]} onClick={() => act('stop', r.name)}>{icon('square', 'h-2.5 w-2.5')}停止</Button>
                    ) : (
                      <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" disabled={!!pending[r.name]} onClick={() => startRecipe(r.name)}>
                        {exited ? icon('rotate-cw', 'h-2.5 w-2.5') : icon('play', 'h-2.5 w-2.5')}{exited ? '重跑' : '启动'}
                      </Button>
                    )}
                  </span>
                </div>
                {paramPanel(r.name)}
                {r.description && <p className="mt-1 text-sm text-muted-foreground/70 truncate">{r.description}</p>}
                <div className="mt-2 rounded bg-terminal-bg px-2 py-1.5 font-mono text-xs leading-relaxed text-terminal-fg/70 min-h-[3.4em]">
                  {tail.length ? tail.map((l, i) => <div key={i} className="truncate">{l}</div>) : <span className="text-terminal-fg/40">$ just {r.name} …</span>}
                </div>
              </div>
            );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 单任务视图:状态头 + 工具行(搜索/级别) + 完整日志流 */
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-none flex items-center gap-2 px-3.5 h-8 border-b bg-background text-sm">
            <span className={`h-1.5 w-1.5 rounded-[var(--radius-full)] ${selRunning ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="font-mono font-medium">{selected}</span>
            <span className="text-muted-foreground font-mono">
              {selRunning
                ? <>running · <ElapsedBadge startedAt={selTask.startedAt} /></>
                : selTask?.signal ? '已停止' : selTask ? `exit ${selTask.code}` : '未运行'}
            </span>
            <span className="ml-auto flex items-center gap-1">
              {selRunning
                ? <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" disabled={!!pending[selected]} onClick={() => act('stop', selected)}>{icon('square', 'h-2.5 w-2.5')}停止</Button>
                : <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" disabled={!!pending[selected]} onClick={() => startRecipe(selected)}>{icon('rotate-cw', 'h-2.5 w-2.5')}{selTask ? '重跑' : '启动'}</Button>}
              <Button variant="ghost" className="h-6 gap-1 px-2 text-sm" onClick={() => act('clear', selected)} disabled={!selLines.length}>{icon('eraser', 'h-2.5 w-2.5')}清屏</Button>
              <span className="text-muted-foreground font-mono ml-1">{selLines.length >= MAX_LOG_LINES ? `${MAX_LOG_LINES}+ 行` : `${selLines.length} 行`}</span>
            </span>
          </div>
          {paramPanel(selected)}
          <div className="flex-none flex items-center gap-2 px-3.5 py-1.5 border-b bg-background">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="搜索日志…"
              aria-label="搜索日志"
              className="h-6 w-40 rounded-[var(--radius-md)] border bg-transparent px-2 text-xs font-mono outline-none placeholder:text-muted-foreground/50 focus:border-muted-foreground/50"
            />
            <FilterPills items={LEVEL_FILTERS} value={levelFilter} onChange={setLevelFilter} ariaLabel="日志级别" />
          </div>
          <div className="relative flex-1 min-h-0">
            <div
              ref={scrollRef}
              data-testid="log-scroll"
              onScroll={onScroll}
              className="h-full overflow-auto bg-terminal-bg p-3.5 font-mono text-xs leading-relaxed text-terminal-fg"
            >
              {visibleLines.length === 0 && (
                <p className="text-terminal-fg/50">
                  {selLines.length === 0 ? `$ just ${selected} · 等待输出…` : '无匹配行'}
                </p>
              )}
              {visibleLines.map(l => <LogLine key={l.seq} line={l} query={query} />)}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={jumpToBottom}
                className="absolute bottom-3 right-4 inline-flex items-center gap-1 h-7 px-3 rounded-[var(--radius-full)] border border-success/40 bg-success/10 text-success text-xs shadow-sm hover:bg-success/20 transition-colors"
              >
                ↓ {unread} 行新输出
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
