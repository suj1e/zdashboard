const TASK_RE = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

export interface ParsedTask {
  text: string
  checked: boolean
}

export function parseTasks(md: string): ParsedTask[] {
  return md
    .split('\n')
    .filter((l) => TASK_RE.test(l))
    .map((l) => {
      const m = l.match(TASK_RE);
      return { text: (m?.[2] ?? l).trim(), checked: m?.[1] !== ' ' };
    });
}

export function countTasks(md: string): { total: number; done: number } {
  const tasks = parseTasks(md);
  return { total: tasks.length, done: tasks.filter((t) => t.checked).length };
}
