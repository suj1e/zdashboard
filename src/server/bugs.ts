import fs from 'node:fs';
import path from 'node:path';
import { fetchJson } from './api/fetch.js';

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

let tokenCache: { key: string; token: string; at: number } | null = null;

async function getToken(cfg: { url: string; account: string; token?: string }): Promise<string> {
  if (cfg.token) return cfg.token;
  const key = `${cfg.url}|${cfg.account}`;
  if (tokenCache && tokenCache.key === key && Date.now() - tokenCache.at < 10 * 60_000) return tokenCache.token;
  const json = await fetchJson(`${cfg.url}/api.php/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: cfg.account, password: '' }),
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

export async function fetchBugs(config: { url: string; account: string; token: string; product: number }): Promise<BugsResult> {
  if (!config.url || !config.product) {
    return { ok: false, error: '配置无效：请设置服务器 URL 和产品 ID' };
  }
  try {
    const token = await getToken(config);
    const json = await fetchJson(
      `${config.url}/api.php/v1/products/${config.product}/bugs?page=1&limit=100`,
      { headers: { Token: token } },
    );
    const raw = Array.isArray(json.bugs) ? (json.bugs as Record<string, unknown>[]) : [];
    return { ok: true, url: config.url, total: Number(json.total ?? raw.length), bugs: raw.map((b) => normBug(b, config.account)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `禅道请求失败(${msg})——检查 url / 凭据 / 是否开启 RESTful API v1` };
  }
}
