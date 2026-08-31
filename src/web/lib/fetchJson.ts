/**
 * fetch 门卫:统一 res.ok 检查,非 2xx 抛 HttpError(status + body error 字段)。
 * 所有前端数据面 fetch 一律走 fetchJson/fetchText,禁止裸 fetch 后直接 r.json()/r.text()。
 */

/** 非 2xx 响应错误:status 用于区分 404(文件不存在)与 5xx(服务异常)文案 */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** 尽力读取错误响应体的 error 字段作为 message;读不出回落「HTTP <status>」 */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown } | null;
    if (body && typeof body.error === 'string' && body.error) return body.error;
  } catch { /* body 非 JSON → 回落默认文案 */ }
  return `HTTP ${res.status}`;
}

async function guard(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) throw new HttpError(res.status, await errorMessage(res));
  return res;
}

/** JSON 门卫:2xx → 解析后的数据;非 2xx/网络异常 → 抛错(usePluginData error 态接管) */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await guard(url, init);
  return res.json() as Promise<T>;
}

/** 文本门卫(viewer 用):2xx → 文本原样;非 2xx → 抛 HttpError */
export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await guard(url, init);
  return res.text();
}

/** viewer 文案:404 →「文件不存在」;其余错误沿用 HttpError message(body error 字段/HTTP status),404 与失败分开表述 */
export function viewerFetchErrorMessage(e: unknown): string {
  if (e instanceof HttpError) return e.status === 404 ? '文件不存在' : e.message;
  return '加载失败: 网络异常';
}
