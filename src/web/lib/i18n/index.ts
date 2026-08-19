import { zhCN } from './zh-CN.js';
import { en } from './en.js';

export type Locale = typeof zhCN;
export type LocaleCode = 'zh-CN' | 'en';

const locales: Record<LocaleCode, Locale> = { 'zh-CN': zhCN, en };

export function getLocale(code: LocaleCode): Locale {
  return locales[code] ?? zhCN;
}

export function detectLocale(): LocaleCode {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN';
  return lang.startsWith('en') ? 'en' : 'zh-CN';
}
