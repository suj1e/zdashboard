/**
 * market 外部资源 URL 常量与代理拼装。
 * 源版本固定 pin major(简单图标 simple-icons@13),避免上游目录变动破坏目录数据。
 */
export const SIMPLE_ICONS_BASE = 'https://cdn.jsdelivr.net/npm/simple-icons@13/icons';
export const ANIMATE_CSS_URL = 'https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css';
export const HOVER_CSS_URL = 'https://cdn.jsdelivr.net/npm/hover.css@2.3.1/css/hover.css';

export const MARKET_TABS = [
  { key: 'logos', label: 'Logo' },
  { key: 'motions', label: '动效' },
  { key: 'inspirations', label: '灵感' },
] as const;

/** 经插件代理取外部资源(SSRF 面收敛到 server 白名单) */
export function proxyUrl(target: string): string {
  return `/__market/proxy?url=${encodeURIComponent(target)}`;
}

export function simpleIconSvg(slug: string): string {
  return `${SIMPLE_ICONS_BASE}/${slug}.svg`;
}
