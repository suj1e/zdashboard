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

/** jsdom 无布局:scrollHeight 按已提交行数动态增长(每行 20px),重现「追加后几何增长」这一关键转移 */
function mockScrollBoxDynamic(el: HTMLElement, clientHeight = 200, lineHeight = 20) {
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => el.querySelectorAll('[data-testid="log-scroll"] > div').length * lineHeight,
  });
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
  it('B1:在底部 → 合批追加 2 行(几何 +40px)→ 仍自动跟随拽到新 scrollHeight', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBoxDynamic(el);
    act(() => { for (let i = 0; i < 20; i++) emitLog(es, `pad ${i}\n`); }); // 内容超出视口(400px > 200px),距底才有意义
    await nextFrame();
    el.scrollTop = el.scrollHeight - el.clientHeight; // 在底(距底 0;jsdom 的 scrollTop 不 clamp,须用合法最大值)
    act(() => { emitLog(es, 'batch-1\n'); emitLog(es, 'batch-2\n'); }); // 本批 2 行 ≈ 40px
    await nextFrame();
    // 旧实现:commit 后重新量几何,距底被本批拉大到 40 → 判不在底 → 不拽底 → 红
    expect(el.scrollTop).toBe(el.scrollHeight - el.clientHeight);
  });

  it('B1:不在底部 → 追加 3 行 → 不拽底且未读计数 +3', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBoxDynamic(el);
    act(() => { for (let i = 0; i < 20; i++) emitLog(es, `pad ${i}\n`); }); // 垫高滚动空间
    await nextFrame();
    el.scrollTop = el.scrollHeight - el.clientHeight - 100; // 距底 100(> 40)→ 离开底部
    fireEvent.scroll(el);
    const stayedAt = el.scrollTop;
    act(() => { emitLog(es, 'away-1\n'); emitLog(es, 'away-2\n'); emitLog(es, 'away-3\n'); });
    await nextFrame();
    expect(el.scrollTop).toBe(stayedAt); // 不拽底
    expect(screen.getByRole('button', { name: '↓ 3 行新输出' })).toBeInTheDocument(); // unread 精确 +3
  });

  it('回底按钮:点击回底清零按钮消失;此后多行合批追加恢复跟随', async () => {
    const es = await mountWithRunningTask();
    const el = scrollBox();
    mockScrollBoxDynamic(el);
    act(() => { for (let i = 0; i < 20; i++) emitLog(es, `pad ${i}\n`); });
    await nextFrame();
    el.scrollTop = el.scrollHeight - el.clientHeight - 100; // 距底 100(> 40)→ 离开底部
    fireEvent.scroll(el);
    act(() => { emitLog(es, 'a\n'); emitLog(es, 'b\n'); });
    await nextFrame();
    const jump = screen.getByRole('button', { name: '↓ 2 行新输出' });
    fireEvent.click(jump);
    expect(el.scrollTop).toBe(el.scrollHeight - el.clientHeight); // 回底
    expect(screen.queryByRole('button', { name: /行新输出/ })).toBeNull(); // 清零

    act(() => { emitLog(es, 'c\n'); emitLog(es, 'd\n'); }); // 手动回底后多行合批 → 必须恢复跟随
    await nextFrame();
    expect(el.scrollTop).toBe(el.scrollHeight - el.clientHeight); // 旧实现重量几何:本批 40px → 再判不在底 → 红
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
