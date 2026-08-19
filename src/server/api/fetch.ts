import ky from 'ky';
import { HttpError, NetworkError } from '../errors.js';

export async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    const res = await ky(url, { ...init, timeout: 8000, retry: 2 });
    return await res.json() as Record<string, unknown>;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new NetworkError(`请求超时: ${url}`);
    }
    if (e instanceof Error && e.name === 'HTTPError') {
      throw new HttpError((e as Error & { status?: number }).status ?? 500, e.message);
    }
    throw new NetworkError(`请求失败: ${url}`, e);
  }
}
