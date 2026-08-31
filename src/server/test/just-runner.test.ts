/**
 * T5 JustRunner 多任务并发核实与验收(单测):
 * - 并发多 recipe:每任务独立子进程/日志缓冲,事件按 taskId(recipe)隔离;
 * - 行缓冲:块中间断开的 chunk 攒到 \n 才成行;
 * - clear 只清目标任务;stop 只杀目标任务;
 * - 退出状态按任务携带 code/signal。
 * JustRunner 核实结论:已是多任务并发 runner(tasks Map,每 recipe 独立进程与日志),无需 runner 池改造。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const children: Array<Record<string, unknown>> = [];
  return { children };
});

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  let pidSeq = 100;
  function makeChild(pid: number) {
    const child = new EventEmitter() as import('node:events').EventEmitter & Record<string, unknown>;
    child.pid = pid;
    child.killed = false;
    child.killSignal = null;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = (signal?: string) => {
      child.killed = true;
      child.killSignal = signal ?? 'SIGTERM';
      return true;
    };
    h.children.push(child);
    return child;
  }
  const cp = {
    spawn: vi.fn(() => makeChild(++pidSeq)),
    execFile: vi.fn((_file: string, _args: string[], _opts: unknown, cb?: (err: unknown, stdout: string) => void) => {
      if (cb) cb(null, 'Available recipes:\na  # do a\nb  # do b\n');
      return { killed: false };
    }),
  };
  return { ...cp, default: cp };
});

import { JustRunner, type JustEvent } from '../just-runner.js';

/** 按启动顺序取子进程(start 顺序 = children 顺序;pidSeq 跨测试递增,不可按 pid 硬编码) */
function childAt(i: number) {
  const c = h.children[i];
  if (!c) throw new Error(`child #${i} not found`);
  return c as unknown as import('node:events').EventEmitter & Record<string, unknown> & {
    stdout: import('node:events').EventEmitter; stderr: import('node:events').EventEmitter; kill: (s?: string) => boolean; killed: boolean; killSignal: unknown; pid: number;
  };
}

beforeEach(() => {
  h.children.length = 0;
});

describe('JustRunner — 多任务并发与日志按 taskId 隔离', () => {
  it('并发 2 recipe:事件载荷按 recipe 隔离,互不串流', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));

    runner.start('a');
    runner.start('b');
    const a = childAt(0);
    const b = childAt(1);
    expect(a).not.toBe(b); // 独立子进程

    a.stdout.emit('data', Buffer.from('line-from-a\n'));
    b.stdout.emit('data', Buffer.from('line-from-b\n'));
    a.stderr.emit('data', Buffer.from('err-from-a\n'));

    const logs = events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    expect(logs.filter((e) => e.recipe === 'a').map((e) => e.text)).toEqual(['line-from-a\n', 'err-from-a\n']);
    expect(logs.filter((e) => e.recipe === 'b').map((e) => e.text)).toEqual(['line-from-b\n']);
  });

  it('行缓冲:无 \\n 的尾巴留在 pending,凑齐才成行', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));
    runner.start('a');
    const a = childAt(0);
    a.stdout.emit('data', Buffer.from('hel'));
    a.stdout.emit('data', Buffer.from('lo\nwor'));
    const logs = events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    // 'hel' + 'lo\n' 合并为一行 'hello\n';'wor' 留在 pending 未成行
    expect(logs.map((e) => e.text)).toEqual(['hello\n']);
    a.stdout.emit('data', Buffer.from('ld\n'));
    const logs2 = events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    expect(logs2.map((e) => e.text)).toEqual(['hello\n', 'world\n']);
  });

  it('进度条输出:行内 \\r 再切分为多段独立推送(降级分段渲染)', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));
    runner.start('a');
    childAt(0).stdout.emit('data', Buffer.from('progress 10%\rprogress 20%\rprogress 30%\n'));
    const logs = events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    expect(logs.map((e) => e.text)).toEqual(['progress 10%\n', 'progress 20%\n', 'progress 30%\n']);
  });

  it('CRLF 行尾的 \\r 不产生空段;连续 \\r 空段丢弃', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));
    runner.start('a');
    childAt(0).stdout.emit('data', Buffer.from('start\r\nnext\r\r\n'));
    const logs = events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    expect(logs.map((e) => e.text)).toEqual(['start\n', 'next\n']);
  });

  it('重连重放:clear(a) 只清 a 的缓冲,b 日志保留', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));
    runner.start('a');
    runner.start('b');
    childAt(0).stdout.emit('data', Buffer.from('a-log\n'));
    childAt(1).stdout.emit('data', Buffer.from('b-log\n'));

    runner.clear('a');
    const replay: JustEvent[] = [];
    runner.subscribe((ev) => replay.push(ev));
    const replayLogs = replay.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[];
    expect(replayLogs.some((e) => e.text === 'a-log\n')).toBe(false);
    expect(replayLogs.some((e) => e.text === 'b-log\n')).toBe(true);
  });

  it('stop(a) 只杀 a 的子进程,b 不受影响', () => {
    const runner = new JustRunner('/tmp/project');
    runner.start('a');
    runner.start('b');
    const a = childAt(0);
    const b = childAt(1);
    runner.stop('a');
    expect(a.killed).toBe(true);
    expect(b.killed).toBe(false);
  });

  it('退出状态按任务携带:exit 事件隔离且含 code/signal', () => {
    const runner = new JustRunner('/tmp/project');
    const events: JustEvent[] = [];
    runner.subscribe((ev) => events.push(ev));
    runner.start('a');
    runner.start('b');
    childAt(0).emit('exit', null, 'SIGTERM');
    childAt(1).emit('exit', 3, null);
    const states = events.filter((e) => e.type === 'state') as Extract<JustEvent, { type: 'state' }>[];
    const aState = states.filter((e) => e.recipe === 'a').at(-1)!;
    const bState = states.filter((e) => e.recipe === 'b').at(-1)!;
    expect(aState).toMatchObject({ state: 'exited', code: 0, signal: 'SIGTERM' });
    expect(bState).toMatchObject({ state: 'exited', code: 3, signal: undefined });
  });
});
