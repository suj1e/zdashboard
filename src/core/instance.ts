import fs from 'node:fs';
import path from 'node:path';
import pkg from '../../package.json' with { type: 'json' };

const CURRENT_VERSION: string = pkg.version;

export interface InstanceRecord {
  pid: number;
  port: number;
  root: string;
  startedAt: string;
  /** 写入该记录的实例版本(信息用途;活实例版本以 /__config 实时值为准) */
  version?: string;
  plugins?: Record<string, Record<string, unknown>>;
}

export const RECORD_FILE = '.zdev/dashboard.json';
export const VERIFY_TIMEOUT_MS = 1500;
export const STOP_POLL_MS = 2000;
export const STOP_POLL_INTERVAL_MS = 100;
export const STOP_FINAL_WAIT_MS = 100;

function recordPath(root: string): string {
  return path.join(root, RECORD_FILE);
}

export function readRecord(root: string): InstanceRecord | null {
  try {
    const fp = recordPath(root);
    const raw = fs.readFileSync(fp, 'utf-8');
    const rec = JSON.parse(raw) as Partial<InstanceRecord>;
    if (
      typeof rec.pid === 'number' &&
      typeof rec.port === 'number' &&
      typeof rec.root === 'string' &&
      typeof rec.startedAt === 'string'
    ) {
      return rec as InstanceRecord;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeRecord(root: string, port: number): void {
  const fp = recordPath(root);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  // 读改写:onListen 每次启动都会调 writeRecord,需沿用旧记录的 plugins 段,
  // 只更新运行字段(pid/port/root/startedAt),否则插件配置跨重启清零。
  const old = readRecord(root); // 记录缺失/损坏 → null,兜底最小记录
  const rec: InstanceRecord = {
    pid: process.pid,
    port,
    root,
    startedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
  if (old?.plugins && typeof old.plugins === 'object') {
    rec.plugins = old.plugins;
  }
  // tmp+rename 原子写(对齐 writePluginsConfig),避免半写状态被读到
  const tmp = fp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2) + '\n');
  fs.renameSync(tmp, fp);
}

export function readPluginsConfig(root: string): Record<string, Record<string, unknown>> {
  try {
    const rec = readRecord(root);
    if (rec?.plugins && typeof rec.plugins === 'object') {
      return rec.plugins as Record<string, Record<string, unknown>>;
    }
  } catch { /* ignore */ }
  return {};
}

export function writePluginsConfig(root: string, plugins: Record<string, Record<string, unknown>>): void {
  const fp = recordPath(root);
  let rec: InstanceRecord;
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    rec = JSON.parse(raw) as InstanceRecord;
  } catch {
    rec = { pid: process.pid, port: 0, root, startedAt: new Date().toISOString() };
  }
  rec.plugins = plugins;
  const tmp = fp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2) + '\n');
  fs.renameSync(tmp, fp);
}

/** 死键剥离判定所需的最小 manifest 投影(PluginManifest 结构兼容) */
export interface ConfigSchemaInfo {
  mode: string;
  external?: boolean;
  /** manifest.config 声明:缺省或空对象表示该内置插件无配置面 */
  config?: Record<string, unknown>;
}

/**
 * 启动一次性:剥离 dashboard.json 里内置插件的死配置键(通用规则,收敛自 view/design 约定化扫描)。
 * - 内置(非 external)未声明 config → 整段死键,清除;
 * - 内置已声明 config → 仅保留声明键(键级收敛);
 * - external 插件键保留;存储中无 manifest 声明的键(未知/未加载插件)保守保留。
 * 无变更/无记录时不写盘。返回是否发生了剥离。记录缺失/损坏跳过清理,不阻塞启动。
 */
export function stripDeadPluginConfig(root: string, manifests: readonly ConfigSchemaInfo[]): boolean {
  try {
    const rec = readRecord(root);
    if (!rec?.plugins || typeof rec.plugins !== 'object') return false;
    const byMode = new Map(manifests.map((m) => [m.mode, m]));
    const stored = rec.plugins as Record<string, unknown>;
    const plugins: Record<string, unknown> = { ...stored };
    let changed = false;
    for (const mode of Object.keys(plugins)) {
      const m = byMode.get(mode);
      // 无声明(未注册,可能是外部插件或已卸载)→ 保守不清;external → 保留
      if (!m || m.external) continue;
      const section = plugins[mode];
      if (section === null || typeof section !== 'object') continue;
      const keys = Object.keys(section as Record<string, unknown>);
      if (!m.config || Object.keys(m.config).length === 0) {
        // 内置且未声明 config → 整段死键
        if (keys.length > 0) {
          delete plugins[mode];
          changed = true;
        }
        continue;
      }
      // 键级收敛:仅保留 manifest.config 声明的键
      const kept: Record<string, unknown> = {};
      for (const key of Object.keys(m.config)) {
        if (key in (section as Record<string, unknown>)) kept[key] = (section as Record<string, unknown>)[key];
      }
      if (Object.keys(kept).length !== keys.length) {
        if (Object.keys(kept).length === 0) delete plugins[mode];
        else plugins[mode] = kept;
        changed = true;
      }
    }
    if (!changed) return false;
    writePluginsConfig(root, plugins as Record<string, Record<string, unknown>>); // tmp+rename 原子写
    return true;
  } catch {
    return false; // 记录缺失/损坏:跳过清理,不阻塞启动
  }
}

export function clearRecord(root: string): void {
  try {
    // 属主校验:记录若已指向别的实例(并发双启落败者),不得误删胜者记录
    const rec = readRecord(root);
    if (rec && rec.pid !== process.pid) return;
    fs.unlinkSync(recordPath(root));
  } catch {
    // best-effort
  }
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ESRCH') return false;
    // EPERM or other → process exists, we just can't signal it
    return true;
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 活实例核验结果:reusable = 存活且 root 匹配;version 为该实例实时版本(供旧版检测) */
export interface VerifyResult {
  reusable: boolean;
  version?: string;
}

export async function verifyRoot(port: number, root: string): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(`http://127.0.0.1:${port}/__config`);
    if (res.status !== 200) return { reusable: false };
    const body = await res.json();
    if (typeof body.root !== 'string') return { reusable: false };
    return {
      reusable: body.root === root,
      version: typeof body.version === 'string' ? body.version : undefined,
    };
  } catch {
    return { reusable: false };
  }
}

/**
 * 可复用实例发现:
 * - reuse          → 存活 + root 匹配 + 版本一致,直接复用;
 * - stale-version  → 存活 + root 匹配但版本落后(调用方决定提示或自动升级接管);
 * - null           → 无可复用实例(无记录/进程死亡/端口被无关进程占用)。
 */
export async function findReusable(
  root: string,
  currentVersion: string,
): Promise<{ status: 'reuse'; record: InstanceRecord } | { status: 'stale-version'; record: InstanceRecord; liveVersion?: string } | null> {
  const rec = readRecord(root);
  if (!rec) return null;
  if (!isAlive(rec.pid)) return null;
  const v = await verifyRoot(rec.port, root);
  if (!v.reusable) return null;
  if (v.version && v.version !== currentVersion) {
    return { status: 'stale-version', record: rec, liveVersion: v.version };
  }
  return { status: 'reuse', record: rec };
}

export async function stopInstance(record: InstanceRecord): Promise<void> {
  try {
    process.kill(record.pid, 'SIGTERM');
  } catch {
    return;
  }

  const deadline = Date.now() + STOP_POLL_MS;
  while (Date.now() < deadline) {
    if (!isAlive(record.pid)) return;
    await new Promise((r) => setTimeout(r, STOP_POLL_INTERVAL_MS));
  }

  // still alive → SIGKILL
  try {
    process.kill(record.pid, 'SIGKILL');
  } catch {
    // ignore
  }
  await new Promise((r) => setTimeout(r, STOP_FINAL_WAIT_MS));
}
