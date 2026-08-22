import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { fetchJson } from './api/fetch.js';

/** .zdev/config.yaml（优先）或 .zgoal/config.yaml（回退）：禅道凭据配置,扁平 key: value */
export const BUGS_CONFIG_CANDIDATES = ['.zdev/config.yaml', '.zgoal/config.yaml'] as const;

export interface ZgoalConfig {
  url: string;
  account: string;
  password?: string;
  token?: string;
  product: number;
}

export interface ZenBug {
  id: number;
  title: string;
  severity: number | string;
  pri: number | string;
  status: string;
  assignedTo: string;
  openedBy?: string;
  /** 指派给 config.account 的本人 */
  mine: boolean;
}

export type BugsResult =
  | { ok: true; url: string; total: number; bugs: ZenBug[] }
  | { ok: false; error: string };

function loadConfig(root: string): ZgoalConfig | null {
  for (const rel of BUGS_CONFIG_CANDIDATES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    try {
      const kv = YAML.parse(fs.readFileSync(file, 'utf8'));
      if (!kv || typeof kv !== 'object') return null;
      const record = kv as Record<string, unknown>;
      const product = Number(record.product);
      if (!record.url || !product) return null;
      const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? undefined : String(v));
      return {
        url: String(record.url).replace(/\/+$/, ''),
        account: str(record.account) ?? '',
        password: str(record.password),
        token: str(record.token),
        product,
      };
    } catch {
      return null;
    }
  }
  return null;
}

let tokenCache: { key: string; token: string; at: number } | null = null;

async function getToken(cfg: ZgoalConfig): Promise<string> {
  if (cfg.token) return cfg.token;
  const key = `${cfg.url}|${cfg.account}|${cfg.password ?? ''}`;
  if (tokenCache && tokenCache.key === key && Date.now() - tokenCache.at < 10 * 60_000) return tokenCache.token;
  const json = await fetchJson(`${cfg.url}/api.php/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: cfg.account, password: cfg.password }),
  });
  const token = typeof json.token === 'string' ? json.token : '';
  if (!token) throw new Error('token 获取失败:检查 account / password');
  tokenCache = { key, token, at: Date.now() };
  return token;
}

function normBug(b: Record<string, unknown>, account: string): ZenBug {
  const assigned = b.assignedTo;
  const assignedTo =
    typeof assigned === 'string'
      ? assigned
      : assigned && typeof assigned === 'object' && 'realname' in (assigned as Record<string, unknown>)
        ? String((assigned as Record<string, unknown>).realname ?? '')
        : '';
  const assignedAccount =
    typeof assigned === 'string'
      ? assigned
      : assigned && typeof assigned === 'object'
        ? String((assigned as Record<string, unknown>).account ?? '')
        : '';
  const mine = !!account && (assignedAccount === account || assignedTo === account);
  return {
    id: Number(b.id),
    title: String(b.title ?? ''),
    severity: (b.severity as number | string) ?? 4,
    pri: (b.pri as number | string) ?? 3,
    status: String(b.status ?? ''),
    assignedTo,
    openedBy: typeof b.openedBy === 'string' ? b.openedBy : undefined,
    mine,
  };
}

/** 只读拉取禅道 bug 列表(GET,绝不写)。失败返回 ok:false,不抛。 */
export async function fetchBugs(root: string): Promise<BugsResult> {
  const cfg = loadConfig(root);
  if (!cfg) {
    const anyExists = BUGS_CONFIG_CANDIDATES.some((rel) => fs.existsSync(path.join(root, rel)));
    return {
      ok: false,
      error: anyExists
        ? '配置存在但无效(缺 url 或 product 字段)——检查 .zdev/config.yaml'
        : '.zdev/config.yaml 缺失(由 zgoal skill 创建;存量 .zgoal/config.yaml 亦可)',
    };
  }
  try {
    const token = await getToken(cfg);
    const json = await fetchJson(
      `${cfg.url}/api.php/v1/products/${cfg.product}/bugs?page=1&limit=100`,
      { headers: { Token: token } },
    );
    const raw = Array.isArray(json.bugs) ? (json.bugs as Record<string, unknown>[]) : [];
    return { ok: true, url: cfg.url, total: Number(json.total ?? raw.length), bugs: raw.map((b) => normBug(b, cfg.account)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `禅道请求失败(${msg})——检查 url / 凭据 / 是否开启 RESTful API v1` };
  }
}
