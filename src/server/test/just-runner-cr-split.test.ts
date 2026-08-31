/**
 * ux-low-batch T5:pushLine 行内 \r 分段单测(回归钉子)。
 * 实现已在基线(pushLine 按 \r 再切分推送),本组用例把行为钉死,防后续回归:
 * - 进度条输出 `A\rB\rC\n` → 三段独立行(前端降级为多行快照渲染,不做行内回写);
 * - CRLF 行尾不误切;段内空段丢弃;整行全空仍推送一条空行(空行是日志内容)。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const children: Array<Record<string, unknown>> = [];
  return { children };
});

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  function makeChild(pid: number) {
    const child = new EventEmitter() as import('node:events').EventEmitter & Record<string, unknown>;
    child.pid = pid;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => true;
    h.children.push(child);
    return child;
  }
  const cp = {
    spawn: vi.fn(() => makeChild(600 + h.children.length)),
    execFile: vi.fn((_f: unknown, _a: unknown, _o: unknown, cb: (e: Error | null, o: string) => void) => cb(null, 'Available recipes:\nbuild')),
  };
  return { ...cp, default: cp };
});

import { JustRunner, type JustEvent } from '../just-runner.js';

function childAt(i: number) {
  return h.children[i] as unknown as {
    stdout: { emit: (e: string, d: Buffer) => void };
    stderr: { emit: (e: string, d: Buffer) => void };
  };
}

/** 启动任务并收集 log 事件文本 */
function startAndCollect(runner: JustRunner, recipe: string) {
  const lines: string[] = [];
  runner.subscribe((ev: JustEvent) => { if (ev.type === 'log' && ev.recipe === recipe) lines.push(ev.text); });
  runner.start(recipe);
  return lines;
}

let runner: JustRunner;

beforeEach(() => {
  h.children.length = 0;
  runner = new JustRunner('.');
});

describe('pushLine — 行内 \\r 分段推送', () => {
  it('进度条 `10%\\r50%\\r90%\\n` → 三段独立行(多行快照渲染)', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('Progress 10%\rProgress 50%\rProgress 90%\n', 'utf-8'));
    expect(lines).toEqual(['Progress 10%\n', 'Progress 50%\n', 'Progress 90%\n']);
  });

  it('CRLF 行尾不误切:`line\\r\\n` → 单行且 \\r 被剥离', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('hello\r\n', 'utf-8'));
    expect(lines).toEqual(['hello\n']);
  });

  it('段内空段丢弃:`a\\r\\rb\\n` → a/b 两段,不含空行', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('a\r\rb\n', 'utf-8'));
    expect(lines).toEqual(['a\n', 'b\n']);
  });

  it('整行全空仍推送一条空行(空行是日志内容,不静默丢弃)', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('\r\n', 'utf-8'));
    expect(lines).toEqual(['\n']);
  });

  it('普通无 \\r 行为零变化(回归)', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('plain line\n', 'utf-8'));
    expect(lines).toEqual(['plain line\n']);
  });

  it('\\r 分段跨 chunk:第一段随首个 \\n 先行推送,残段等后续 chunk', () => {
    const lines = startAndCollect(runner, 'build');
    childAt(0).stdout.emit('data', Buffer.from('one\r', 'utf-8')); // 无 \n:整段留 pending
    expect(lines).toEqual([]);
    childAt(0).stdout.emit('data', Buffer.from('two\n', 'utf-8')); // \n 到达:一次性切两段
    expect(lines).toEqual(['one\n', 'two\n']);
  });
});
