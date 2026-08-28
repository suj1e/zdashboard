/**
 * zskills 新约定对齐:🔧[人工] 条目不计入 total/done,单列 manual 计数。
 * 三分支:人工未勾 / 人工已勾 / 无人工;仅匹配 task 行首 `- [ ] 🔧[人工]` 模式(正文提及不误伤)。
 */
import { describe, it, expect } from 'vitest';
import { countTasks, parseTasks } from '../parse-tasks.js';

describe('countTasks — 🔧[人工] 条目口径', () => {
  it('人工未勾:不进 total/done,计入 manual', () => {
    const md = '- [ ] 🔧[人工] 人工确认部署\n- [ ] 普通待办';
    expect(countTasks(md)).toEqual({ total: 1, done: 0, manual: 1 });
  });

  it('人工已勾:同样不进 total/done,计入 manual', () => {
    const md = '- [x] 🔧[人工] 人工确认部署\n- [x] 普通已完成';
    expect(countTasks(md)).toEqual({ total: 1, done: 1, manual: 1 });
  });

  it('无人工条目:manual 为 0,total/done 维持原口径', () => {
    const md = '- [ ] 待办\n- [x] 已完成\n- [ ] 另一待办';
    expect(countTasks(md)).toEqual({ total: 3, done: 1, manual: 0 });
  });

  it('混合场景:全勾非人工 + 未勾人工 → 进度 100% 语义(total=done)', () => {
    const md = '- [x] a\n- [x] b\n- [ ] 🔧[人工] 待人工\n- [x] 🔧[人工] 已人工';
    expect(countTasks(md)).toEqual({ total: 2, done: 2, manual: 2 });
  });

  it('正文提及 🔧[人工] 不误伤(仅行首匹配)', () => {
    const md = '- [ ] 参考 🔧[人工] 约定再操作\n- [x] 正常项';
    const c = countTasks(md);
    // 行首以 🔧[人工] 开头才算人工;行中提及不算
    expect(c.total).toBe(2);
    expect(c.done).toBe(1);
    expect(c.manual).toBe(0);
  });

  it('CRLF 行尾:与 LF 口径一致(含 🔧[人工] 条目)', () => {
    const crlf = '- [ ] a\r\n- [x] 🔧[人工] b\r\n- [x] c\r\n';
    expect(countTasks(crlf)).toEqual({ total: 2, done: 1, manual: 1 });
    // 与 LF 基准完全一致
    expect(countTasks(crlf)).toEqual(countTasks('- [ ] a\n- [x] 🔧[人工] b\n- [x] c\n'));
  });
});

describe('parseTasks — manual 标记', () => {
  it('人工条目标记 manual:true 且保留 🔧[人工] 前缀文字', () => {
    const items = parseTasks('- [ ] 🔧[人工] 人工确认\n- [ ] 普通项');
    expect(items[0]).toEqual({ text: '🔧[人工] 人工确认', checked: false, manual: true });
    expect(items[1]).toEqual({ text: '普通项', checked: false, manual: false });
  });

  it('CRLF 行尾:text 不残留 \\r', () => {
    const items = parseTasks('- [ ] a\r\n- [ ] 🔧[人工] b\r\n');
    expect(items.map((t) => t.text)).toEqual(['a', '🔧[人工] b']);
  });
});
