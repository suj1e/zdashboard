/**
 * just-log-ux T5 runner 集成单测:带参启动与参数探测。
 * - start(recipe, args) → spawn('just', [recipe, k=v...], 无 shell):数组 argv 原样传值,特殊字符安全;
 * - recipeParams(name):懒执行 just --show 解析签名,进程内缓存(命中不再探测);
 * - recipesWithParams():列表 + 逐 recipe 参数清单。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const children: Array<Record<string, unknown>> = [];
  return { children };
});

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  let pidSeq = 300;
  function makeChild(pid: number) {
    const child = new EventEmitter() as import('node:events').EventEmitter & Record<string, unknown>;
    child.pid = pid;
    child.killed = false;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => { child.killed = true; return true; };
    h.children.push(child);
    return child;
  }
  const cp = {
    spawn: vi.fn(() => makeChild(++pidSeq)),
    execFile: vi.fn((_file: string, args: string[], _opts: unknown, cb?: (err: unknown, stdout: string) => void) => {
      const a = args as string[];
      if (!cb) return { killed: false };
      if (a[0] === '--show') {
        // 真实 just --show 输出:首行是 recipe 上方注释,签名在注释之后(与 playground justfile 实况一致)
        if (a[1] === 'hello') cb(null, '# 参数示例\nhello msg="world":\n    @echo "hello {{ msg }}"\n');
        else cb(new Error('no recipe'), '');
        return { killed: false };
      }
      cb(null, 'Available recipes:\nbuild  # build all\nhello msg="world"  # greeting\n');
      return { killed: false };
    }),
  };
  return { ...cp, default: cp };
});

import { JustRunner } from '../just-runner.js';
import { spawn, execFile } from 'node:child_process';

const spawnMock = vi.mocked(spawn);
const execFileMock = vi.mocked(execFile);

beforeEach(() => {
  h.children.length = 0;
  spawnMock.mockClear();
  execFileMock.mockClear();
});

describe('JustRunner.start — 带参 argv 拼装', () => {
  it('start(recipe, {msg:"x"}) → spawn("just", ["hello","msg=x"]) 且不开 shell', () => {
    const runner = new JustRunner('/tmp/project');
    runner.start('hello', { msg: 'x' });
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [file, argv, opts] = spawnMock.mock.calls[0] as [string, string[], Record<string, unknown>];
    expect(file).toBe('just');
    expect(argv).toEqual(['hello', 'msg=x']);
    expect(opts.shell).toBeFalsy(); // 数组 argv 安全的前提:不经 shell 拼接
  });

  it('值含空格仍为单个 argv 元素', () => {
    const runner = new JustRunner('/tmp/project');
    runner.start('hello', { msg: 'a b' });
    const argv = spawnMock.mock.calls[0]![1] as string[];
    expect(argv).toEqual(['hello', 'msg=a b']);
    expect(argv).toHaveLength(2);
  });

  it('无 args → argv 仅 [recipe],行为与旧版一致', () => {
    const runner = new JustRunner('/tmp/project');
    runner.start('build');
    expect(spawnMock.mock.calls[0]![1]).toEqual(['build']);
  });
});

describe('JustRunner.recipeParams — 懒探测与进程内缓存', () => {
  it('just --show 首行签名 → ["msg"]', async () => {
    const runner = new JustRunner('/tmp/project');
    await expect(runner.recipeParams('hello')).resolves.toEqual(['msg']);
    const showCall = execFileMock.mock.calls.find(c => (c[1] as string[])[0] === '--show');
    expect(showCall).toBeTruthy();
  });

  it('缓存命中:第二次同名探测不再触发 execFile', async () => {
    const runner = new JustRunner('/tmp/project');
    await runner.recipeParams('hello');
    const before = execFileMock.mock.calls.length;
    await runner.recipeParams('hello');
    expect(execFileMock.mock.calls.length).toBe(before);
  });

  it('--show 失败 → params [](并缓存失败,避免反复探测)', async () => {
    const runner = new JustRunner('/tmp/project');
    await expect(runner.recipeParams('nope')).resolves.toEqual([]);
    const before = execFileMock.mock.calls.length;
    await runner.recipeParams('nope');
    expect(execFileMock.mock.calls.length).toBe(before);
  });
});

describe('JustRunner.recipesWithParams — 列表附参数清单', () => {
  it('recipes 列表逐项携带 params', async () => {
    const runner = new JustRunner('/tmp/project');
    await expect(runner.recipesWithParams()).resolves.toEqual([
      { name: 'build', description: 'build all', params: [] },
      { name: 'hello', description: 'greeting', params: ['msg'] },
    ]);
  });
});
