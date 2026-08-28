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

  it('正常读取 → { run: { id }, state: 全量 BatchState }', () => {
    writeCurrent(root, 'run-42');
    writeState(root, 'run-42', STATE);
    expect(readBatchState(root)).toEqual({ run: { id: 'run-42' }, state: STATE });
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
