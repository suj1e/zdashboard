import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export interface DetectResult {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
  hasBugs: boolean;
}

function justAvailable(cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = execFile('just', ['--list', '--unsupported'], { cwd, timeout: 5000 }, (err) => {
      resolve(!err);
    });
    if (child.killed) resolve(false);
  });
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
