/**
 * 提示词模板与最近记录(design.md「三市场视图」模板表单源)。
 * 纯函数无框架依赖:模板插值、localStorage 环形历史(最新在前,超限截断)。
 */

export type MarketKey = 'logos' | 'motions' | 'inspirations';

export const MARKET_LABELS: Record<MarketKey, string> = {
  logos: 'Logo',
  motions: '动效',
  inspirations: '灵感',
};

export const PROMPT_HISTORY_LIMIT = 5;
const HISTORY_KEY = 'zdashboard.market.promptHistory';

export interface PromptRecord {
  market: MarketKey;
  text: string;
  at: number;
}

/** Logo:参考 simple-icons 事实(单色/几何/24×24)注入,显式商标合规红线 */
export function logoPrompt(opts: { name: string; subject?: string }): string {
  const subject = opts.subject?.trim() || opts.name;
  return `为 ${subject} 设计一个 Logo:单色几何风格、极简、24×24 网格、适配 favicon 与暗色模式;参考 ${opts.name} 的造型语言(仅风格参考,不得复制商标)`;
}

/** 动效:描述 + 参考实现(CSS 源码内嵌)+ 通用工程要求 */
export function motionPrompt(opts: { name: string; desc: string; css: string }): string {
  return `实现一个 ${opts.name} 动效:${opts.desc};参考实现:${opts.css};要求可自定义时长/缓动,尊重 prefers-reduced-motion`;
}

/** 灵感:元数据模板 + 用户补充段(空补充给占位语义,不留空句) */
export function inspirationPrompt(opts: { name: string; url: string; tags: string[]; extra: string }): string {
  const feature = opts.tags.filter(Boolean).join(';');
  const extra = opts.extra.trim() || '无特殊要求';
  const featureSeg = feature ? `:特征 ${feature}` : '';
  return `设计一个类似 ${opts.name}(${opts.url})的页面${featureSeg};要求 ${extra}`;
}

function safeParse(raw: string | null): PromptRecord[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr.filter((x) => !!x && typeof x === 'object') as PromptRecord[]) : [];
  } catch {
    return [];
  }
}

export function loadPromptHistory(store: Storage = localStorage): PromptRecord[] {
  return safeParse(store.getItem(HISTORY_KEY));
}

/** 追加一条,最新在前,超出 ${PROMPT_HISTORY_LIMIT} 截断 */
export function recordPromptHistory(rec: { market: MarketKey; text: string }, store: Storage = localStorage): PromptRecord[] {
  const next: PromptRecord[] = [
    { market: rec.market, text: rec.text, at: Date.now() },
    ...safeParse(store.getItem(HISTORY_KEY)),
  ].slice(0, PROMPT_HISTORY_LIMIT);
  store.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
