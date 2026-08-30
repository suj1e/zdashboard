/**
 * 目录注册表:market 名 → 内置条目(目录与取数分离,目录演进不动代理)。
 * 响应契约(design.md):{ entries: [{ id, name, ...市场字段 }] },logos 附带 slug(= id)。
 */
import { LOGOTYPES, type LogotypeEntry } from './logotypes.js';
import { MOTIONS, type MotionEntry } from './motions.js';
import { INSPIRATIONS, type InspirationEntry } from './inspirations.js';

export type { LogotypeEntry, MotionEntry, InspirationEntry };

export const MARKETS = ['logos', 'motions', 'inspirations'] as const;
export type MarketName = (typeof MARKETS)[number];

export interface CatalogResponse {
  entries: Array<Record<string, unknown>>;
}

export function isMarketName(v: string): v is MarketName {
  return (MARKETS as readonly string[]).includes(v);
}

export function catalogFor(market: string): CatalogResponse | null {
  switch (market) {
    case 'logos':
      return { entries: LOGOTYPES.map((e) => ({ ...e, slug: e.id })) };
    case 'motions':
      return { entries: MOTIONS.map((e) => ({ ...e })) };
    case 'inspirations':
      return { entries: INSPIRATIONS.map((e) => ({ ...e })) };
    default:
      return null;
  }
}
