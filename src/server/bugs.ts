import fs from 'node:fs';
import path from 'node:path';

/** .zgoal/config.yaml(zgoal skill 的禅道凭据配置,扁平 key: value) */
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

/** 极简扁平 yaml 解析(仅 key: value 行,够 .zgoal/config.yaml 用) */
function loadZgoalConfig(root: string): ZgoalConfig | null {
  const file = path.join(root, '.zgoal', 'config.yaml');
  if (!fs.existsSync(file)) return null;
  const kv: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*:\s*(.+?)\s*$/);
    if (m && !m[2].startsWith('#')) kv[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const product = Number(kv.product);
  if (!kv.url || !product) return null;
  return {
    url: kv.url.replace(/\/+$/, ''),
    account: kv.account ?? '',
    password: kv.password,
    token: kv.token,
    product,
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(text); } catch { /* 非 JSON 当空 */ }
    if (!res.ok) {
      const err = json.error;
      throw new Error(`HTTP ${res.status}${typeof err === 'string' ? `: ${err}` : ''}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
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
  const cfg = loadZgoalConfig(root);
  if (!cfg) return { ok: false, error: '.zgoal/config.yaml 缺失或 url/product 未配置(由 zgoal skill 创建)' };
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
