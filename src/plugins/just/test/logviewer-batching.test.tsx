/**
 * just-log-ux T2/T4 组件验收:渲染合批 + seq key + memo + elapsed 局部化。
 * - FakeES 连发 10 个 log 事件 → rAF flush 前无行渲染,一帧后一次性追加(每行恰渲染 1 次);
 * - 追加新批后旧行不重渲(memo + seq key);
 * - elapsed 每秒 tick 收敛到头部/徽标组件,日志行零重渲。
 * LogLine 以计数桩 mock 顶替(记录每 seq 渲染次数),行内容用 data-testid=log-line-<seq> 断言。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LogViewer } from '../../../web/components/LogViewer.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

const h = vi.hoisted(() => ({ counts: new Map<number, number>() }));

vi.mock('../../../web/components/log-lines.js', async () => {
  const React = await import('react');
  const inner = vi.fn(function LogLineInner({ line }: { line: { seq: number; text: string } }) {
    h.counts.set(line.seq, (h.counts.get(line.seq) ?? 0) + 1);
    return React.createElement('div', { 'data-testid': `log-line-${line.seq}` }, line.text);
  });
  return { LogLine: React.memo(inner) };
});

class FakeES {
  static instances: FakeES[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeES.instances.push(this); }
  addEventListener(): void {}
  removeEventListener(): void {}
  close(): void {}
}

const RECIPES = [{ name: 'dev-server', description: 'dev' }];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

/** rAF 是合批的 flush 时钟:推进一帧让 pending 落地 */
const nextFrame = () => act(async () => { await new Promise(r => requestAnimationFrame(r)); });

function emitLog(es: FakeES, text: string) {
  es.onmessage?.({ data: JSON.stringify({ type: 'log', recipe: 'dev-server', text }) });
}

beforeEach(() => {
  h.counts.clear();
  __resetPluginDataForTest();
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
    if (url.includes('/__just/recipes')) return okJson(RECIPES);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountWithRunningTask() {
  render(<LogViewer />);
  const es = FakeES.instances.at(-1)!;
  act(() => { es.onopen?.(); }); // 首开仅置位
  act(() => { es.onmessage?.({ data: JSON.stringify({ type: 'state', recipe: 'dev-server', state: 'running', code: null, startedAt: Date.now() }) }); });
  await nextFrame();
  return es;
}

describe('LogViewer 渲染合批 — FakeES 连发事件', () => {
  it('连发 10 事件:rAF flush 前零行渲染,一帧后 10 行一次性出现且各只渲染 1 次', async () => {
    const es = await mountWithRunningTask();
    act(() => { for (let i = 0; i < 10; i++) emitLog(es, `line ${i}\n`); });
    // flush 前无任何行渲染(旧实现每事件一次 setLogs,同步 act 内已出队 → 此处红)
    expect(screen.queryByTestId(/log-line-\d+/)).toBeNull();
    await nextFrame();
    const nodes = screen.getAllByTestId(/log-line-\d+/);
    expect(nodes).toHaveLength(10);
    for (const n of nodes) {
      const seq = Number(n.getAttribute('data-testid')!.replace('log-line-', ''));
      expect(h.counts.get(seq)).toBe(1);
    }
    // 顺序保序:line 0..9(计数桩渲染原文,尾随 \n 保留)
    expect(nodes.map(n => n.textContent)).toEqual(Array.from({ length: 10 }, (_, i) => `line ${i}\n`));
  });

  it('追加第二批后,首批旧行不重渲(memo + seq key)', async () => {
    const es = await mountWithRunningTask();
    act(() => { for (let i = 0; i < 5; i++) emitLog(es, `old ${i}\n`); });
    await nextFrame();
    const oldSeqs = screen.getAllByTestId(/log-line-\d+/).map(n => Number(n.getAttribute('data-testid')!.replace('log-line-', '')));
    expect(oldSeqs).toHaveLength(5);

    act(() => { for (let i = 0; i < 10; i++) emitLog(es, `new ${i}\n`); });
    await nextFrame();
    expect(screen.getAllByTestId(/log-line-\d+/)).toHaveLength(15);
    for (const seq of oldSeqs) expect(h.counts.get(seq)).toBe(1); // 旧行零重渲(旧实现 key={i} + 内联渲染 → 红)
  });
});

describe('LogViewer elapsed 局部化', () => {
  it('每秒 tick 不再全量重渲:elapsed 徽标更新到 1s,日志行渲染计数不变', async () => {
    const es = await mountWithRunningTask();
    act(() => { for (let i = 0; i < 3; i++) emitLog(es, `tick-line ${i}\n`); });
    await nextFrame();
    const seqs = screen.getAllByTestId(/log-line-\d+/).map(n => Number(n.getAttribute('data-testid')!.replace('log-line-', '')));
    const before = seqs.map(s => h.counts.get(s));

    await act(async () => { await new Promise(r => setTimeout(r, 1100)); }); // 真实跨过一个 1s tick
    expect(screen.getByText('1s')).toBeInTheDocument(); // elapsed 徽标在走(旧实现为头部拼接文本,无独立 '1s' 节点 → 红)
    expect(seqs.map(s => h.counts.get(s))).toEqual(before); // 旧行零重渲(forceTick 全量重渲 → 红)
  });
});
