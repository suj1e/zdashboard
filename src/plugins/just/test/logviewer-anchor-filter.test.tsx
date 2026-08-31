/**
 * just-log-ux T3 组件验收:滚动锚定 / 回底按钮 / 搜索高亮 / 级别 FilterPills。
 * - 在底部(距底 <40px)→ 新输出自动跟随;上翻 → 不拽底,浮动「↓ N 行新输出」计数,点击回底清零;
 * - 搜索输入防抖 150ms,命中行 <mark> 高亮、未命中行隐藏,渲染层过滤不改存储;
 * - 级别 pill(全部/信息/警告/错误/成功)按 levelClass 识别过滤。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { LogViewer } from '../../../web/components/LogViewer.js';
import { __resetPluginDataForTest } from '../../../web/hooks/usePluginData.js';

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

const nextFrame = () => act(async () => { await new Promise(r => requestAnimationFrame(r)); });

function emitLog(es: FakeES, text: string) {
  es.onmessage?.({ data: JSON.stringify({ type: 'log', recipe: 'dev-server', text }) });
}

/** jsdom 无布局:滚动容器的 scrollHeight/clientHeight 手工钉值,scrollTop 可写 */
function mockScrollBox(el: HTMLElement, scrollHeight: number, clientHeight: number) {
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
}

const scrollBox = () => document.querySelector<HTMLElement>('[data-testid="log-scroll"]')!;

beforeEach(() => {
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountWithRunningTask() {
  render(<LogViewer />);
  const es = FakeES.instances.at(-1)!;
  act(() => { es.onopen?.(); });
  act(() => { es.onmessage?.({ data: JSON.stringify({ type: 'state', recipe: 'dev-server', state: 'running', code: null, startedAt: Date.now() }) }); });
  await nextFrame();
  return es;
}

describe('LogViewer 滚动锚定与回底', () => {
  it('在底部时新输出自动跟随(scrollTop 拽到 scrollHeight)', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBox(el, 1000, 200);
    el.scrollTop = 800; // 距底 0 → 在底部
    act(() => { emitLog(es, 'follow-1\n'); emitLog(es, 'follow-2\n'); });
    await nextFrame();
    expect(el.scrollTop).toBe(1000); // 旧实现无条件拽底同样通过;真正的行为差异在下两个用例
    expect(screen.getByText('follow-2')).toBeInTheDocument();
  });

  it('上翻离开底部:新输出不拽底,出现「↓ 3 行新输出」', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBox(el, 1000, 200);
    el.scrollTop = 800;
    act(() => { emitLog(es, 'first\n'); });
    await nextFrame();

    el.scrollTop = 100; // 距底 900 → 离开底部
    fireEvent.scroll(el);
    act(() => { emitLog(es, 'away-1\n'); emitLog(es, 'away-2\n'); emitLog(es, 'away-3\n'); });
    await nextFrame();
    expect(el.scrollTop).toBe(100); // 无条件拽底旧实现 → 红
    expect(screen.getByRole('button', { name: '↓ 3 行新输出' })).toBeInTheDocument(); // 未读计数精确 3
  });

  it('点击回底按钮:滚回底部、计数清零按钮消失,后续新输出恢复跟随', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBox(el, 1000, 200);
    el.scrollTop = 800;
    act(() => { emitLog(es, 'first\n'); });
    await nextFrame();

    el.scrollTop = 100;
    fireEvent.scroll(el);
    act(() => { emitLog(es, 'a\n'); emitLog(es, 'b\n'); });
    await nextFrame();
    const jump = screen.getByRole('button', { name: '↓ 2 行新输出' });
    fireEvent.click(jump);
    expect(el.scrollTop).toBe(1000);
    expect(screen.queryByRole('button', { name: /行新输出/ })).toBeNull(); // 回底清零

    act(() => { emitLog(es, 'c\n'); }); // 已回底 → 恢复自动跟随
    await nextFrame();
    expect(el.scrollTop).toBe(1000);
  });
});

describe('LogViewer 搜索高亮(防抖 150ms)', () => {
  const debounceWait = () => new Promise(r => setTimeout(r, 200));

  async function mountWithLines() {
    const es = await mountWithRunningTask();
    act(() => {
      emitLog(es, 'ERROR boom\n');
      emitLog(es, 'plain line\n');
      emitLog(es, 'ERROR again\n');
    });
    await nextFrame();
    expect(screen.getAllByText(/ERROR|plain line/)).toHaveLength(3);
    return es;
  }

  it('输入后防抖窗口内不过滤,到点后命中行 <mark> 高亮、未命中行隐藏', async () => {
    await mountWithLines();
    const input = screen.getByLabelText('搜索日志');
    fireEvent.change(input, { target: { value: 'error' } });
    // 防抖窗口内:尚未过滤
    expect(screen.getByText('plain line')).toBeInTheDocument();

    await act(debounceWait);
    expect(screen.queryByText('plain line')).toBeNull();
    const marks = document.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect([...marks].map(m => m.textContent)).toEqual(['ERROR', 'ERROR']); // 保留原文大小写
  });

  it('清空搜索恢复全量行且 mark 消失(渲染层派生,存储未动)', async () => {
    await mountWithLines();
    const input = screen.getByLabelText('搜索日志');
    fireEvent.change(input, { target: { value: 'error' } });
    await act(debounceWait);
    expect(screen.queryByText('plain line')).toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    await act(debounceWait);
    expect(screen.getByText('plain line')).toBeInTheDocument();
    expect(document.querySelectorAll('mark')).toHaveLength(0);
  });
});

describe('LogViewer 级别 FilterPills 过滤', () => {
  async function mountWithLevels() {
    const es = await mountWithRunningTask();
    act(() => {
      emitLog(es, '[ERROR] boom\n');
      emitLog(es, '[WARN] careful\n');
      emitLog(es, 'plain output\n');
      emitLog(es, '[INFO] ok\n');
    });
    await nextFrame();
  }

  it('点「错误」pill → 只显 error 行;点「警告」→ 只显 warn 行', async () => {
    await mountWithLevels();
    const group = screen.getByRole('group', { name: '日志级别' });
    fireEvent.click(within(group).getByText('错误'));
    expect(screen.getByText('[ERROR] boom')).toBeInTheDocument();
    expect(screen.queryByText('[WARN] careful')).toBeNull();
    expect(screen.queryByText('plain output')).toBeNull();
    expect(screen.queryByText('[INFO] ok')).toBeNull();

    fireEvent.click(within(group).getByText('警告'));
    expect(screen.getByText('[WARN] careful')).toBeInTheDocument();
    expect(screen.queryByText('[ERROR] boom')).toBeNull();
  });

  it('点「全部」恢复全量(过滤为渲染层派生,行未丢失)', async () => {
    await mountWithLevels();
    const group = screen.getByRole('group', { name: '日志级别' });
    fireEvent.click(within(group).getByText('错误'));
    fireEvent.click(within(group).getByText('全部'));
    expect(screen.getByText('[ERROR] boom')).toBeInTheDocument();
    expect(screen.getByText('[WARN] careful')).toBeInTheDocument();
    expect(screen.getByText('plain output')).toBeInTheDocument();
    expect(screen.getByText('[INFO] ok')).toBeInTheDocument();
  });
});
