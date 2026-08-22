import { spawn, execFile, type ChildProcess } from 'node:child_process';

export interface Recipe { name: string; description: string; }
export type TaskStatus = 'running' | 'exited';
export interface TaskInfo { recipe: string; state: TaskStatus; code: number | null; startedAt: number; signal?: string }

export type JustEvent =
  | { type: 'log'; recipe: string; text: string }
  | { type: 'clear'; recipe: string }
  | { type: 'state'; recipe: string; state: TaskStatus; code: number | null; startedAt?: number; signal?: string };

interface Task {
  recipe: string;
  child: ChildProcess | null;
  state: TaskStatus;
  code: number | null;
  signal?: string;
  startedAt: number;
  buffer: string[];
  pending: string; // 行缓冲:块缓冲输出会在行中间断开,攒到 \n 才切行
}

const MAX_BUFFER = 1000;

/** 多任务并发 runner:每个 recipe 独立进程/日志/状态,同名 start 即重启,互不影响 */
export class JustRunner {
  private cwd: string;
  private tasks = new Map<string, Task>();
  private clients = new Set<(ev: JustEvent) => void>();
  private recipesCache: Recipe[] | null = null;

  constructor(cwd: string) { this.cwd = cwd; }

  recipes(): Promise<Recipe[]> {
    if (this.recipesCache) return Promise.resolve(this.recipesCache);
    return new Promise((resolve) => {
      execFile('just', ['--list', '--unsorted'], { cwd: this.cwd, maxBuffer: 1 << 20, timeout: 8000 }, (err, stdout) => {
        if (err) { resolve([]); return; }
        const out: Recipe[] = [];
        const seen = new Set<string>();
        for (const line of stdout.split(/\r?\n/).slice(1)) { // 跳过 "Available recipes:"
          const trimmed = line.trim();
          if (!trimmed) continue;
          const hashIdx = trimmed.indexOf('#');
          const sig = (hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed).trim();
          if (!sig) continue;
          const name = sig.split(/\s+/)[0]; // "hello msg=..." -> "hello"
          if (seen.has(name)) continue;
          seen.add(name);
          out.push({ name, description: hashIdx >= 0 ? trimmed.slice(hashIdx + 1).trim() : '' });
        }
        this.recipesCache = out;
        resolve(out);
      });
    });
  }

  subscribe(fn: (ev: JustEvent) => void): () => void {
    this.clients.add(fn);
    // 连上即重放:全部任务的日志与状态
    for (const t of this.tasks.values()) {
      for (const text of t.buffer) fn({ type: 'log', recipe: t.recipe, text });
      fn({ type: 'state', recipe: t.recipe, state: t.state, code: t.code, startedAt: t.startedAt });
    }
    return () => this.clients.delete(fn);
  }

  private emit(ev: JustEvent) { for (const fn of this.clients) fn(ev); }

  list(): TaskInfo[] {
    return Array.from(this.tasks.values(), (t) => ({ recipe: t.recipe, state: t.state, code: t.code, startedAt: t.startedAt }));
  }

  /** 启动 recipe:同名先停旧进程(重启语义),不影响其他任务;调用方须先用 recipes() 校验名字 */
  start(recipe: string) {
    this.killOne(recipe);
    const task: Task = { recipe, child: null, state: 'running', code: null, startedAt: Date.now(), buffer: [], pending: '' };
    this.tasks.set(recipe, task);
    this.emit({ type: 'clear', recipe }); // 广播清屏:同步清掉该任务上一轮残留日志
    this.emit({ type: 'state', recipe, state: 'running', code: null, startedAt: task.startedAt });
    const child = spawn('just', [recipe], {
      cwd: this.cwd,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1', // node 生态(chalk 等)
        // maven 检测非 tty 会关颜色;经 MAVEN_OPTS 强制开(保留用户已有值)
        MAVEN_OPTS: `${process.env.MAVEN_OPTS ?? ''} -Dstyle.color=always`.trim(),
        CI: '',
      },
    });
    task.child = child;
    // 身份守卫:同名重启后旧进程的迟到输出/退出不得污染新任务(闭包 task 是旧对象时静默丢弃)
    const isStale = () => this.tasks.get(recipe) !== task;
    const push = (d: Buffer) => {
      if (isStale()) return;
      task.pending += d.toString();
      let idx: number;
      while ((idx = task.pending.indexOf('\n')) >= 0) {
        const line = task.pending.slice(0, idx + 1);
        task.pending = task.pending.slice(idx + 1);
        this.pushLine(task, line);
      }
      // 无 \n 的尾巴留在 pending,等下个 chunk(块缓冲输出会在行中断开,不能当独立行)
    };
    child.stdout?.on('data', push);
    child.stderr?.on('data', push);
    child.on('error', (err) => { this.pushLine(task, `[zdashboard] spawn error: ${err.message}\n`); });
    child.on('exit', (code, signal) => {
      if (task.pending && !isStale()) { this.pushLine(task, task.pending + '\n'); } // flush 末尾无换行的残留
      task.pending = '';
      task.child = null;
      task.state = 'exited';
      task.code = code ?? 0;
      task.signal = signal ?? undefined; // 用户主动 stop 时 code=null+SIGTERM,与成功退出区分
      if (isStale()) return; // 迟到的旧进程退出,不打扰新任务状态
      this.emit({ type: 'state', recipe, state: 'exited', code: task.code, startedAt: task.startedAt, signal: task.signal });
    });
  }

  private pushLine(task: Task, line: string) {
    task.buffer.push(line);
    if (task.buffer.length > MAX_BUFFER) task.buffer.shift();
    this.emit({ type: 'log', recipe: task.recipe, text: line });
  }

  /** 停单个任务;不传 recipe 停全部 */
  stop(recipe?: string) {
    if (recipe === undefined) { for (const t of this.tasks.values()) this.killOne(t.recipe); }
    else this.killOne(recipe);
  }

  restart(recipe: string) {
    if (this.tasks.has(recipe)) this.start(recipe);
  }

  private killOne(recipe: string) {
    const task = this.tasks.get(recipe);
    const child = task?.child;
    if (child?.pid) {
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
        else child.kill('SIGTERM');
      } catch { /* 已退出 */ }
    }
    if (task) { task.child = null; }
  }
}
