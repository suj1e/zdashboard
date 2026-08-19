import { spawn, execFile, type ChildProcess } from 'node:child_process';

export interface Recipe { name: string; description: string; }
export type JustState = 'idle' | 'running' | 'exited';
export type JustEvent =
  | { type: 'log'; text: string }
  | { type: 'clear' }
  | { type: 'state'; state: JustState; recipe: string | null; code: number | null };

const MAX_BUFFER = 1000;

export class JustRunner {
  private cwd: string;
  private child: ChildProcess | null = null;
  private recipe: string | null = null;
  private state: JustState = 'idle';
  private code: number | null = null;
  private buffer: string[] = [];
  private pending = ''; // 行缓冲:块缓冲输出(如 maven)的 chunk 会在行中间断开,攒到 \n 才切行
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
    // 连上即重放:历史日志 + 当前状态
    for (const text of this.buffer) fn({ type: 'log', text });
    fn({ type: 'state', state: this.state, recipe: this.recipe, code: this.code });
    return () => this.clients.delete(fn);
  }

  private emit(ev: JustEvent) { for (const fn of this.clients) fn(ev); }

  info() { return { state: this.state, recipe: this.recipe, code: this.code }; }

  /** 启动 recipe(调用方须先用 recipes() 校验名字);自动停旧进程 */
  start(recipe: string) {
    this.killChild();
    this.recipe = recipe;
    this.code = null;
    this.state = 'running';
    this.buffer = [];
    this.pending = '';
    this.emit({ type: 'clear' }); // 广播清屏:已连接的订阅者同步清掉上一个任务的残留日志
    this.emit({ type: 'state', state: 'running', recipe, code: null });
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
    this.child = child;
    const push = (d: Buffer) => {
      this.pending += d.toString();
      let idx: number;
      while ((idx = this.pending.indexOf('\n')) >= 0) {
        const line = this.pending.slice(0, idx + 1);
        this.pending = this.pending.slice(idx + 1);
        this.pushLine(line);
      }
      // 无 \n 的尾巴留在 pending,等下个 chunk(块缓冲输出会在行中断开,不能当独立行)
    };
    child.stdout?.on('data', push);
    child.stderr?.on('data', push);
    child.on('error', (err) => { this.pushLine(`[zdashboard] spawn error: ${err.message}\n`); });
    child.on('exit', (code) => {
      if (this.pending) { this.pushLine(this.pending + '\n'); this.pending = ''; } // flush 末尾无换行的残留
      this.child = null;
      this.state = 'exited';
      this.code = code ?? 0;
      this.emit({ type: 'state', state: 'exited', recipe: this.recipe, code: this.code });
    });
  }

  private pushLine(line: string) {
    this.buffer.push(line);
    if (this.buffer.length > MAX_BUFFER) this.buffer.shift();
    this.emit({ type: 'log', text: line });
  }

  stop() {
    this.killChild();
  }

  restart(recipe?: string) {
    const target = recipe ?? this.recipe;
    if (target) this.start(target);
  }

  private killChild() {
    const child = this.child;
    if (child?.pid) {
      try {
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
        else child.kill('SIGTERM');
      } catch { /* 已退出 */ }
    }
    this.child = null;
  }
}
