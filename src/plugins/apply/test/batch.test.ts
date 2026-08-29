/**
 * batch 只读读取器单测(design.md 测试策略「单元」节四分支):
 * - 无 CURRENT → { run: null, state: null }
 * - 非法 runId(字符校验 [A-Za-z0-9-])→ { run: null, state: null }
 * - JSON 损坏 → { run: { id }, state: null }
 * - 正常读取 → { run: { id }, state: BatchState }
 * 边界:CURRENT 空白 / state.json 缺失 / graph 投影形状(state null 与有 state 两态)。
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readBatchState, projectGraph, type BatchState } from '../batch.js';

function makeRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zd-batch-reader-'));
}

function writeCurrent(root: string, runId: string): void {
  fs.mkdirSync(path.join(root, '.zdev', 'apply'), { recursive: true });
  fs.writeFileSync(path.join(root, '.zdev', 'apply', 'CURRENT'), runId);
}

function writeState(root: string, runId: string, state: unknown): void {
  fs.mkdirSync(path.join(root, '.zdev', 'apply', 'runs', runId), { recursive: true });
  fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', runId, 'state.json'), JSON.stringify(state));
}

const STATE: BatchState = {
  version: '1',
  status: 'running',
  changes: [
    {
      name: 'alpha',
      path: 'openspec/changes/alpha',
      status: 'running',
      priority: 1,
      risk: 'low',
      dependencies: [],
      estimatedDuration: 5,
      batchIndex: 0,
      retryCount: 0,
      checkpoint: { currentTaskIndex: 1, totalTasks: 3, completedTasks: 1, currentTask: '写实现' },
    },
    {
      name: 'beta',
      path: 'openspec/changes/beta',
      status: 'pending',
      priority: 2,
      risk: 'medium',
      dependencies: ['alpha'],
      estimatedDuration: 10,
      batchIndex: 1,
      retryCount: 0,
    },
  ],
  batches: [{ index: 0, changeNames: ['alpha'], status: 'running' }],
  currentBatchIndex: 0,
  parallelism: 2,
  logs: [{ timestamp: '2026-01-01T00:00:00Z', level: 'info', message: 'started' }],
  conflicts: [{ changeA: 'alpha', changeB: 'beta', files: ['a.ts'], resolution: 'serialize' }],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

let root: string;
beforeEach(() => { root = makeRoot(); });
afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

describe('readBatchState — 四分支', () => {
  it('无 CURRENT → { run: null, state: null }', () => {
    expect(readBatchState(root)).toEqual({ run: null, state: null });
  });

  it.each(['../evil', 'bad_id', 'bad.id', 'sp ace', '中文run', 'id\n.reset'])(
    '非法 runId %j(字符校验 [A-Za-z0-9-] 之外)→ { run: null, state: null }', (bad) => {
      writeCurrent(root, bad);
      // 即便非法 runId 同名目录/state.json 存在也不得读取(路径穿越防护)
      writeState(root, 'reset', STATE);
      expect(readBatchState(root)).toEqual({ run: null, state: null });
    },
  );

  it('JSON 损坏 → { run: { id }, state: null }', () => {
    writeCurrent(root, 'run-1');
    fs.mkdirSync(path.join(root, '.zdev', 'apply', 'runs', 'run-1'), { recursive: true });
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', 'run-1', 'state.json'), 'not-json{{');
    expect(readBatchState(root)).toEqual({ run: { id: 'run-1' }, state: null });
  });

  it.each([
    ['数组', '[1,2]'],
    ['字符串', '"just a string"'],
    ['数字', '3'],
    ['true', 'true'],
    ['JSON null', 'null'],
  ])('合法 JSON 但非对象(%s)→ { run: { id }, state: null },不抛错', (_label, raw) => {
    writeCurrent(root, 'run-1');
    fs.mkdirSync(path.join(root, '.zdev', 'apply', 'runs', 'run-1'), { recursive: true });
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', 'run-1', 'state.json'), raw);
    expect(() => readBatchState(root)).not.toThrow();
    expect(readBatchState(root)).toEqual({ run: { id: 'run-1' }, state: null });
  });

  it('正常读取 → { run: { id }, state: 全量 BatchState }', () => {
    writeCurrent(root, 'run-42');
    writeState(root, 'run-42', STATE);
    expect(readBatchState(root)).toEqual({ run: { id: 'run-42' }, state: STATE });
  });
});

describe('readBatchState — 显式 run 寻址(多战线,design ④)', () => {
  it('合法显式 runId → 跳过 CURRENT 直接读 runs/<runId>/state.json(override 生效)', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    const other = { ...STATE, status: 'paused' as const };
    writeState(root, 'run-2', other);
    expect(readBatchState(root, 'run-2')).toEqual({ run: { id: 'run-2' }, state: other });
  });

  it('非法显式 runId(字符校验外)→ 忽略 override,回退 CURRENT', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    // 非法 runId 即使同名目录存在也不得读取(路径穿越防护),回退 CURRENT 的 run-1
    expect(readBatchState(root, '../evil')).toEqual({ run: { id: 'run-1' }, state: STATE });
    expect(readBatchState(root, 'bad_id')).toEqual({ run: { id: 'run-1' }, state: STATE });
  });

  it('显式 runId 合法但 state.json 缺失 → { run: { id }, state: null }(既有语义)', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    expect(readBatchState(root, 'ghost-run')).toEqual({ run: { id: 'ghost-run' }, state: null });
  });

  it('显式 runId state.json JSON 损坏 → { run: { id }, state: null }', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    fs.mkdirSync(path.join(root, '.zdev', 'apply', 'runs', 'run-bad'), { recursive: true });
    fs.writeFileSync(path.join(root, '.zdev', 'apply', 'runs', 'run-bad', 'state.json'), 'not-json{{');
    expect(readBatchState(root, 'run-bad')).toEqual({ run: { id: 'run-bad' }, state: null });
  });

  it('显式 runId 带首尾空白 → trim 后合法读取', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    const other = { ...STATE, status: 'paused' as const };
    writeState(root, 'run-2', other);
    expect(readBatchState(root, '  run-2  ')).toEqual({ run: { id: 'run-2' }, state: other });
  });

  it('无 explicitRun 参数 → 走 CURRENT(既有语义不变)', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    const other = { ...STATE, status: 'paused' as const };
    writeState(root, 'run-2', other);
    expect(readBatchState(root)).toEqual({ run: { id: 'run-1' }, state: STATE });
  });

  it('显式 runId 为空字符串 → 视为未提供,走 CURRENT', () => {
    writeCurrent(root, 'run-1');
    writeState(root, 'run-1', STATE);
    expect(readBatchState(root, '')).toEqual({ run: { id: 'run-1' }, state: STATE });
  });
});

describe('readBatchState — 边界', () => {
  it('CURRENT 纯空白(trim 后空)→ { run: null, state: null }', () => {
    writeCurrent(root, '   \n  ');
    expect(readBatchState(root)).toEqual({ run: null, state: null });
  });

  it('CURRENT 有效但 state.json 缺失(run 目录不存在)→ { run: { id }, state: null }', () => {
    writeCurrent(root, 'ghost-run');
    expect(readBatchState(root)).toEqual({ run: { id: 'ghost-run' }, state: null });
  });

  it('CURRENT 带 Windows 换行 → trim 后正常读取', () => {
    writeCurrent(root, 'run-1\r\n');
    writeState(root, 'run-1', STATE);
    const snap = readBatchState(root);
    expect(snap.run).toEqual({ id: 'run-1' });
    expect(snap.state).toEqual(STATE);
  });
});

describe('projectGraph — 投影形状(同原 /__apply-batch/graph)', () => {
  it('state 有值 → changes 投影(name/status/dependencies/batchIndex) + batches/conflicts 原样', () => {
    expect(projectGraph(STATE)).toEqual({
      changes: [
        { name: 'alpha', status: 'running', dependencies: [], batchIndex: 0 },
        { name: 'beta', status: 'pending', dependencies: ['alpha'], batchIndex: 1 },
      ],
      batches: STATE.batches,
      conflicts: STATE.conflicts,
    });
  });

  it('state null → 三数组空投影', () => {
    expect(projectGraph(null)).toEqual({ changes: [], batches: [], conflicts: [] });
  });
});

describe('projectGraph — 字段容忍(外部写入缺字段/非数组不抛错,投影空数组)', () => {
  it('state 缺 conflicts → conflicts 空数组,changes/batches 投影不受影响', () => {
    const partial = { ...STATE, conflicts: undefined } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    const g = projectGraph(partial);
    expect(g.conflicts).toEqual([]);
    expect(g.changes).toHaveLength(2);
    expect(g.batches).toEqual(STATE.batches);
  });

  it('state 缺 changes → changes 空数组,batches/conflicts 原样', () => {
    const partial = { ...STATE, changes: undefined } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    const g = projectGraph(partial);
    expect(g.changes).toEqual([]);
    expect(g.batches).toEqual(STATE.batches);
    expect(g.conflicts).toEqual(STATE.conflicts);
  });

  it('state.changes 非数组(字符串)→ changes 空数组,不抛错', () => {
    const partial = { ...STATE, changes: 'oops' } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    expect(projectGraph(partial).changes).toEqual([]);
  });

  it('state.batches 非数组(对象)→ batches 空数组,不抛错', () => {
    const partial = { ...STATE, batches: { index: 0 } } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    expect(projectGraph(partial).batches).toEqual([]);
  });

  it('state.conflicts 非数组(数字)→ conflicts 空数组,不抛错', () => {
    const partial = { ...STATE, conflicts: 3 } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    expect(projectGraph(partial).conflicts).toEqual([]);
  });

  it('change.dependencies 非数组(字符串)→ 该 change 投影 dependencies 为空数组,不抛错', () => {
    const partial = {
      ...STATE,
      changes: [{ ...STATE.changes[1], dependencies: 'alpha' }] as never,
    } as unknown as BatchState;
    expect(() => projectGraph(partial)).not.toThrow();
    expect(projectGraph(partial).changes).toEqual([
      { name: 'beta', status: 'pending', dependencies: [], batchIndex: 1 },
    ]);
  });

  it('change.dependencies 缺失 → 投影 dependencies 为空数组', () => {
    const partial = {
      ...STATE,
      changes: [{ ...STATE.changes[1], dependencies: undefined }] as never,
    } as unknown as BatchState;
    expect(projectGraph(partial).changes).toEqual([
      { name: 'beta', status: 'pending', dependencies: [], batchIndex: 1 },
    ]);
  });
});
