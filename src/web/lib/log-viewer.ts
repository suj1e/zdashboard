/**
 * LogViewer 纯逻辑:滚动锚定 / 回底未读计数 / 日志级别识别 / 搜索高亮切分。
 * 无 DOM/React 依赖,便于单测(锚定阈值 40px、级别识别与着色同源)。
 */

/** 距底小于该阈值视为「在底部」,自动跟随新输出 */
export const AT_BOTTOM_THRESHOLD_PX = 40;

/** 日志窗口上限(与 SSE 存储截断一致),达到后行数显示为「1000+ 行」 */
export const MAX_LOG_LINES = 1000;

/** 距底判定:scrollHeight - scrollTop - clientHeight < threshold */
export function isAtBottom(scrollHeight: number, scrollTop: number, clientHeight: number, threshold = AT_BOTTOM_THRESHOLD_PX): boolean {
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/** 回底按钮未读行数:新增总数 - 已见总数;窗口滑动截断导致变小时归零 */
export function newLinesCount(total: number, lastSeen: number): number {
  return Math.max(0, total - lastSeen);
}

export type LogLevel = 'error' | 'warn' | 'info' | 'success' | 'plain';

/** 行首级别词识别(INFO/DOWNLOAD/PROGRESS 视为成功绿,DEBUG 视为信息蓝) */
export function levelOf(text: string): LogLevel {
  if (/^\[(ERROR|FATAL)\]/.test(text) || /^ERROR\b/.test(text)) return 'error';
  if (/^\[(WARN|WARNING)\]/.test(text) || /^WARN(ING)?\b/.test(text)) return 'warn';
  if (/^\[DEBUG\]/.test(text) || /^DEBUG\b/.test(text)) return 'info';
  if (/^\[(INFO|DOWNLOAD|PROGRESS)\]/.test(text) || /^INFO\b/.test(text)) return 'success';
  return 'plain';
}

/** 着色类名;级别 FilterPills 过滤也按此匹配(识别单源) */
export function levelClass(text: string): string {
  switch (levelOf(text)) {
    case 'error': return 'text-destructive';
    case 'warn': return 'text-warning';
    case 'info': return 'text-info';
    case 'success': return 'text-success';
    default: return 'text-terminal-fg';
  }
}

export interface HighlightSegment { text: string; hit: boolean }

/**
 * 搜索命中切分(大小写不敏感,命中片段保留原文大小写)。
 * 无命中或 query 为空 → null(调用方直接渲染原文,不进 <mark> 分支)。
 */
export function splitHighlight(text: string, query: string): HighlightSegment[] | null {
  if (!query) return null;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const out: HighlightSegment[] = [];
  let i = 0;
  let found = false;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) {
      out.push({ text: text.slice(i), hit: false });
      break;
    }
    if (idx > i) out.push({ text: text.slice(i, idx), hit: false });
    out.push({ text: text.slice(idx, idx + q.length), hit: true });
    found = true;
    i = idx + q.length;
  }
  return found ? out : null;
}
