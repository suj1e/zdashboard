const TASK_RE = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

/** zskills/zapply 约定:任务行首的 🔧[人工] 前缀标记(人工项不计完成度) */
const MANUAL_PREFIX = '🔧[人工]';

export interface ParsedTask {
  text: string
  checked: boolean
  /** 行首 🔧[人工] 标记的人工条目 */
  manual?: boolean
}

export function parseTasks(md: string): ParsedTask[] {
  // 按可选 \r 拆行:CRLF 文件(\r 是正则行终止符,$ 无法锚定其前)否则全量失配
  return md
    .split(/\r?\n/)
    .filter((l) => TASK_RE.test(l))
    .map((l) => {
      const m = l.match(TASK_RE);
      const text = (m?.[2] ?? l).trim();
      return { text, checked: m?.[1] !== ' ', manual: text.startsWith(MANUAL_PREFIX) };
    });
}

export function countTasks(md: string): { total: number; done: number; manual: number } {
  const tasks = parseTasks(md);
  const normal = tasks.filter((t) => !t.manual);
  return {
    total: normal.length,
    done: normal.filter((t) => t.checked).length,
    manual: tasks.length - normal.length,
  };
}
