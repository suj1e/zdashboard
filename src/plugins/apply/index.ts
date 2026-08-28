/**
 * apply server 侧:definePlugin 接入(manifest 单源)。
 * 单 change 读路由(/__apply、/__apply/change)与批量只读路由(/__apply/batch*)。
 * 批量只读:状态文件由 zapply skill 写入,dashboard 不提供任何写路由(避免双写冲突)。
 * 响应形状:错误手写 400/404 + {error},不经 SDK 500 兜底(与既有契约一致)。
 */
import type http from 'node:http';
import { scanApplyChanges, readApplyChange } from './scan.js';
import { readBatchState, projectGraph, tailLogs, readBatchPlan } from './batch.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

/** 错误响应:写状态码 + {error: 具体信息},返回 undefined 短路 SDK json 包装 */
function errorResponse(res: http.ServerResponse, status: number, msg: string): undefined {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: msg }));
  return undefined;
}

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    ctx.route('/__apply', async () => scanApplyChanges(root));

    ctx.route('/__apply/change', async (req, res) => {
      const url = new URL(req.url || '', 'http://x');
      const name = url.searchParams.get('name');
      const bad = (msg: string) => errorResponse(res, 400, msg);
      if (!name) return bad('missing name');
      if (name.includes('..') || name.includes('/') || name.includes('\\')) return bad('invalid name');
      try {
        return readApplyChange(root, name);
      } catch (e) {
        return bad(e instanceof Error ? e.message : 'unknown error');
      }
    });

    // ── 批量驾驶舱只读路由(数据源 .zdev/apply/runs/<runId>/) ──
    ctx.route('/__apply/batch', async () => readBatchState(root));

    ctx.route('/__apply/batch/graph', async () => projectGraph(readBatchState(root).state));

    ctx.route('/__apply/batch/logs', async () => tailLogs(readBatchState(root).state));

    ctx.route('/__apply/batch/plan', async (_req, res) => {
      const snap = readBatchState(root);
      const plan = snap.run ? readBatchPlan(root, snap.run.id) : null;
      if (plan == null) return errorResponse(res, 404, 'plan not found');
      return { plan };
    });
  },
});
