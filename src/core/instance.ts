import fs from 'node:fs';
import path from 'node:path';

export interface InstanceRecord {
  pid: number;
  port: number;
  root: string;
  startedAt: string;
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
  fs.mkdirSync(path.dirname(recordPath(root)), { recursive: true });
  const rec: InstanceRecord = {
    pid: process.pid,
    port,
    root,
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(recordPath(root), JSON.stringify(rec, null, 2) + '\n');
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

export async function verifyRoot(port: number, root: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`http://127.0.0.1:${port}/__config`);
    if (res.status !== 200) return false;
    const body = await res.json();
    if (typeof body.root !== 'string') return false;
    return body.root === root;
  } catch {
    return false;
  }
}

export async function findReusable(root: string): Promise<InstanceRecord | null> {
  const rec = readRecord(root);
  if (!rec) return null;
  if (!isAlive(rec.pid)) return null;
  if (!(await verifyRoot(rec.port, root))) return null;
  return rec;
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
