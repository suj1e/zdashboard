/**
 * 批量执行只读读取器(zapply 新约定):读 `.zdev/apply/CURRENT` 指针 →
 * `.zdev/apply/runs/<runId>/state.json` 快照。无状态投影,不持缓存——
 * state.json 由 zapply skill 外部写入,文件小、读廉价,缓存失效复杂度不值得。
 *
 * 空态语义(design.md 契约):无 CURRENT / runId 非法 → { run: null, state: null };
 * CURRENT 有效但 state.json 缺失或 JSON 损坏 → { run: { id }, state: null },前端空态引导。
 * BatchState 接口形状与旧 ApplyBatchStore(.zapply/batch-state.json 时代)完全一致。
 */
import fs from 'node:fs';
import path from 'node:path';

export interface BatchChange {
  name: string;
  path: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'parked' | 'skipped';
  priority: number;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  dependencies: string[];
  estimatedDuration: number;
  batchIndex: number;
  checkpoint?: {
    currentTaskIndex: number;
    totalTasks: number;
    completedTasks: number;
    currentTask: string;
  };
  error?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
}

export interface BatchLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  changeName?: string;
}

export interface BatchConflict {
  changeA: string;
  changeB: string;
  files: string[];
  resolution: 'serialize' | 'merge' | 'ignore';
}

export interface BatchState {
  version: string;
  status: 'idle' | 'analyzing' | 'pending-approval' | 'running' | 'paused' | 'completed' | 'failed';
  changes: BatchChange[];
  batches: {
    index: number;
    changeNames: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
  }[];
  currentBatchIndex: number;
  parallelism: number;
  logs: BatchLog[];
  conflicts: BatchConflict[];
  /** 战线别名(zskills 0.6.0 可选字段,并行战线时标识本 run;缺失/空则前端不展示) */
  front?: string;
  createdAt: string;
  updatedAt: string;
}

/** 活动 run 指针(只读快照引用) */
export interface BatchRunRef {
  id: string;
}

/** GET /__apply/batch 响应形状 */
export interface BatchSnapshot {
  run: BatchRunRef | null;
  state: BatchState | null;
}

/** GET /__apply/batch/graph 响应形状(与旧 /__apply-batch/graph 一致) */
export interface BatchGraph {
  changes: Array<Pick<BatchChange, 'name' | 'status' | 'dependencies' | 'batchIndex'>>;
  batches: BatchState['batches'];
  conflicts: BatchConflict[];
}

/** runId 仅允许字母/数字/连字符(同时阻断路径穿越);与 zapply 生成约定一致 */
const RUN_ID_PATTERN = /^[A-Za-z0-9-]+$/;

/** BatchState 必须是普通对象:数组/原始值放行会让投影层 state.changes.map 抛 TypeError */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readText(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

/** 读活动 run 指针与状态快照;任何缺失/非法分支均降级为空态而非抛错。
 *  explicitRun(多战线寻址):先过同一 RUN_ID_PATTERN,非法则忽略回退 CURRENT;
 *  合法则跳过 CURRENT 直接读 runs/<runId>/state.json(缺失/损坏 → { run: { id }, state: null })。 */
export function readBatchState(root: string, explicitRun?: string): BatchSnapshot {
  const applyDir = path.join(root, '.zdev', 'apply');
  const requested = explicitRun?.trim() ?? '';
  const runId = requested && RUN_ID_PATTERN.test(requested)
    ? requested
    : (readText(path.join(applyDir, 'CURRENT'))?.trim() ?? '');
  if (!runId || !RUN_ID_PATTERN.test(runId)) {
    return { run: null, state: null };
  }
  const parsed: unknown = (() => {
    const text = readText(path.join(applyDir, 'runs', runId, 'state.json'));
    if (text == null) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  if (!isPlainObject(parsed)) {
    return { run: { id: runId }, state: null };
  }
  // 形状守卫已确认普通对象;字段级结构由消费方容忍(外部写入,无 schema 校验层)
  return { run: { id: runId }, state: parsed as unknown as BatchState };
}

/** batch state → 依赖图投影;state 缺失时给三数组空投影(前端空态直接消费) */
export function projectGraph(state: BatchState | null): BatchGraph {
  if (!state) {
    return { changes: [], batches: [], conflicts: [] };
  }
  // 字段容忍:state 由 zapply skill 外部写入、无 schema 校验层(zskills 0.6.0 中 conflicts 非必填),
  // changes/batches/conflicts 及 change.dependencies 缺失/非数组一律投影为空数组而非抛错。
  const rawChanges: unknown = state.changes;
  const rawBatches: unknown = state.batches;
  const rawConflicts: unknown = state.conflicts;
  return {
    changes: (Array.isArray(rawChanges) ? rawChanges : []).map((c: BatchChange) => ({
      name: c.name,
      status: c.status,
      dependencies: Array.isArray(c?.dependencies) ? c.dependencies : [],
      batchIndex: c.batchIndex,
    })),
    batches: Array.isArray(rawBatches) ? rawBatches : [],
    conflicts: Array.isArray(rawConflicts) ? rawConflicts : [],
  };
}

/** 日志尾窗口:GET /__apply/batch/logs 只回最近 N 条(与旧行为一致) */
export const BATCH_LOGS_TAIL = 100;

export function tailLogs(state: BatchState | null): BatchLog[] {
  return (state?.logs ?? []).slice(-BATCH_LOGS_TAIL);
}

/** 读活动 run 的 plan.md 文本;缺失返回 null(路由层转 404,前端空态承接) */
export function readBatchPlan(root: string, runId: string): string | null {
  return readText(path.join(root, '.zdev', 'apply', 'runs', runId, 'plan.md'));
}
