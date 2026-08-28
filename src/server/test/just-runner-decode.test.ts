/**
 * just 日志编码智能解码 单测(design.md 测试策略五场景):
 * 构造 Buffer 直接喂 push 等价入口(mock child_process → stdout/stderr emit('data', Buffer)):
 * 1. GBK 中文行 → 正确解码(UTF-8 严格解码失败回退 GBK)
 * 2. UTF-8 中文行 → 不回归
 * 3. GBK+UTF-8 混合多行 → 各行正确
 * 4. 多字节跨 chunk(一行中文从字节中点/字符中点切成两个 chunk)→ 不错乱
 * 5. 纯 ASCII → 不回归
 * 附加:stderr 与 stdout 同规则。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import iconv from 'iconv-lite';

const h = vi.hoisted(() => {
  const children: Array<Record<string, unknown>> = [];
  return { children };
});

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  let pidSeq = 500;
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
    execFile: vi.fn((_f: string, _a: string[], _o: unknown, cb?: (e: unknown, s: string) => void) => {
      if (cb) cb(null, 'Available recipes:\na  # do a\n');
      return { killed: false };
    }),
  };
  return { ...cp, default: cp };
});

import { JustRunner, type JustEvent } from '../just-runner.js';

function childAt(i: number) {
  const c = h.children[i];
  if (!c) throw new Error(`child #${i} not found`);
  return c as unknown as import('node:events').EventEmitter & {
    stdout: import('node:events').EventEmitter;
    stderr: import('node:events').EventEmitter;
  };
}

function setup() {
  const runner = new JustRunner('/tmp/project');
  const events: JustEvent[] = [];
  runner.subscribe((ev) => events.push(ev));
  runner.start('a');
  return {
    runner,
    logs: () => (events.filter((e) => e.type === 'log') as Extract<JustEvent, { type: 'log' }>[]).map((e) => e.text),
  };
}

beforeEach(() => {
  h.children.length = 0;
});

describe('JustRunner — 日志编码智能解码(design 五场景)', () => {
  it('场景1 GBK 中文行:严格 UTF-8 解码失败回退 GBK,输出正确中文', () => {
    const { logs } = setup();
    childAt(0).stdout.emit('data', iconv.encode('你好,构建成功\n', 'gbk'));
    expect(logs()).toEqual(['你好,构建成功\n']);
  });

  it('场景2 UTF-8 中文行:不回归', () => {
    const { logs } = setup();
    childAt(0).stdout.emit('data', Buffer.from('构建完成,0 个错误\n', 'utf-8'));
    expect(logs()).toEqual(['构建完成,0 个错误\n']);
  });

  it('场景3 GBK+UTF-8 混合多行(同一 chunk):各行分别正确解码', () => {
    const { logs } = setup();
    const chunk = Buffer.concat([
      iconv.encode('第一行来自GBK\n', 'gbk'),
      Buffer.from('第二行来自UTF8\n', 'utf-8'),
      iconv.encode('第三行又是GBK\n', 'gbk'),
    ]);
    childAt(0).stdout.emit('data', chunk);
    expect(logs()).toEqual(['第一行来自GBK\n', '第二行来自UTF8\n', '第三行又是GBK\n']);
  });

  it('场景4a 多字节跨 chunk(UTF-8,切点落在字符字节中间):不错乱', () => {
    const { logs } = setup();
    // '中文AB\n' = 9 字节;切在 4:『中』完整 + 『文』首字节 | 『文』余下字节 + AB\n
    const full = Buffer.from('中文AB\n', 'utf-8');
    childAt(0).stdout.emit('data', full.subarray(0, 4));
    childAt(0).stdout.emit('data', full.subarray(4));
    expect(logs()).toEqual(['中文AB\n']);
  });

  it('场景4b 多字节跨 chunk(GBK,字节中点切):不错乱', () => {
    const { logs } = setup();
    // '中文行\n' GBK = 7 字节;中点切 3:『中』完整 + 『文』首字节 | 『文』余下 + 『行』 + \n
    const full = iconv.encode('中文行\n', 'gbk');
    childAt(0).stdout.emit('data', full.subarray(0, 3));
    childAt(0).stdout.emit('data', full.subarray(3));
    expect(logs()).toEqual(['中文行\n']);
  });

  it('场景5 纯 ASCII:不回归', () => {
    const { logs } = setup();
    childAt(0).stdout.emit('data', Buffer.from('build started\ndone in 1.2s\n'));
    expect(logs()).toEqual(['build started\n', 'done in 1.2s\n']);
  });

  it('stderr 与 stdout 同规则:GBK 中文经 stderr 也正确解码', () => {
    const { logs } = setup();
    childAt(0).stderr.emit('data', iconv.encode('警告:编码告警\n', 'gbk'));
    childAt(0).stderr.emit('data', Buffer.from('utf8 stderr 中文\n', 'utf-8'));
    expect(logs()).toEqual(['警告:编码告警\n', 'utf8 stderr 中文\n']);
  });

  it('跨 chunk 的 GBK 行缓冲:半个 GBK 字符留 pending,凑齐整行才解码', () => {
    const { logs } = setup();
    const full = iconv.encode('中文内容\n', 'gbk');
    // 切在 5:『中』『文』完整 + 『内』首字节 | 余下
    childAt(0).stdout.emit('data', full.subarray(0, 5));
    expect(logs()).toEqual([]); // 无 \n 且行未完整,不产出行
    childAt(0).stdout.emit('data', full.subarray(5));
    expect(logs()).toEqual(['中文内容\n']);
  });
});
