import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export interface DetectResult {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
  hasBugs: boolean;
}

/** --list 主探测超时(与迁移前一致) */
const JUST_PROBE_TIMEOUT_MS = 5000;
/** --version 兜底探测超时(快失败:二进制存在性检查无需长等) */
const JUST_FALLBACK_TIMEOUT_MS = 3000;

function justAvailable(cwd: string): Promise<boolean> {
  /** 探测一次:进程正常退出即视为可用 */
  const probe = (args: string[], timeout: number) => new Promise<boolean>((resolve) => {
    const child = execFile('just', args, { cwd, timeout }, (err) => resolve(!err));
    if (child.killed) resolve(false);
  });
  // 旧版以 --list --unsupported 判定;新版 just 移除该旗标会报错(hasJust 恒 false),
  // 回退 --version 探测二进制本身可用
  return probe(['--list', '--unsupported'], JUST_PROBE_TIMEOUT_MS)
    .then((ok) => (ok ? true : probe(['--version'], JUST_FALLBACK_TIMEOUT_MS)));
}

function hasBugsConfig(root: string): boolean {
  const dashboardPath = path.join(root, '.zdev', 'dashboard.json');
  if (!fs.existsSync(dashboardPath)) return false;
  try {
    const raw = fs.readFileSync(dashboardPath, 'utf-8');
    const rec = JSON.parse(raw) as { plugins?: { bugs?: Record<string, unknown> } };
    const bugs = rec.plugins?.bugs;
    if (bugs && typeof bugs === 'object' && bugs.url && bugs.product) return true;
  } catch { /* ignore */ }
  return false;
}

export async function detect(root: string): Promise<DetectResult> {
  const hasOpenspec = fs.existsSync(path.join(root, 'openspec'));
  const hasDocs = fs.existsSync(path.join(root, 'docs'));
  const hasJust = await justAvailable(root);
  const hasBugs = hasBugsConfig(root);
  return { hasOpenspec, hasDocs, hasJust, hasBugs };
}

/** /__detect 的响应形状:bugs 探测位随 bugs 插件移除而固定为 false(一个版本期后由清理 change 摘除) */
export interface DetectResponse {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
  hasJustbugs: false;
}

/** 现场探测(每次请求重新跑),供 /__detect 独立路由使用 */
export async function detectLiveShape(root: string): Promise<DetectResponse> {
  const d = await detect(root);
  return { hasOpenspec: d.hasOpenspec, hasDocs: d.hasDocs, hasJust: d.hasJust, hasJustbugs: false };
}
