/**
 * just-log-ux T5 组件验收:带参 recipe 启动面板。
 * - recipes 携带 params(可缺省,兼容旧形状);点带参 recipe「启动」弹参数输入面板(动态字段,placeholder=参数名);
 * - 确认后 POST /__just/start 携带 args:Record<param, value>;无参 recipe 直接启动不弹面板;
 * - 取消关闭面板不发请求;空值字段不进 args(用 just 默认值)。
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

const RECIPES = [
  { name: 'hello', description: 'greeting', params: ['msg'] },
  { name: 'build', description: 'build all', params: [] },
];

function okJson(v: unknown) {
  return { ok: true, status: 200, json: async () => v } as unknown as Response;
}

const nextFrame = () => act(async () => { await new Promise(r => requestAnimationFrame(r)); });

let startBodies: unknown[] = [];

beforeEach(() => {
  __resetPluginDataForTest();
  startBodies = [];
  vi.stubGlobal('EventSource', FakeES);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/__just/start')) {
      startBodies.push(JSON.parse(String(init?.body ?? '{}')));
      return okJson([]);
    }
    if (url.includes('/__config')) return okJson({ stopToken: 'tok' });
    if (url.includes('/__just/recipes')) return okJson(RECIPES);
    throw new Error(`unexpected fetch: ${url}`);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountConsole() {
  render(<LogViewer />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe('LogViewer 带参启动面板 — 总控台卡片', () => {
  it('点带参 recipe「启动」弹面板(placeholder=参数名),提交携带 args', async () => {
    await mountConsole();
    const card = screen.getAllByText('hello').map(e => e.closest('.group')).find(Boolean) as HTMLElement;
    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /启动/ }));
    const panel = await screen.findByTestId('param-panel');
    expect(within(panel).getByLabelText('msg')).toHaveAttribute('placeholder', 'msg');

    fireEvent.change(within(panel).getByLabelText('msg'), { target: { value: 'x' } });
    fireEvent.click(within(panel).getByRole('button', { name: '启动' }));
    await act(async () => { await Promise.resolve(); });
    expect(startBodies).toEqual([{ recipe: 'hello', args: { msg: 'x' } }]); // 旧实现恒无 args → 红
    expect(screen.queryByTestId('param-panel')).toBeNull(); // 提交后收起
  });

  it('无参 recipe 直接启动,不弹面板、不携带 args', async () => {
    await mountConsole();
    const card = screen.getAllByText('build').map(e => e.closest('.group')).find(Boolean) as HTMLElement;
    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /启动/ }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('param-panel')).toBeNull();
    expect(startBodies).toEqual([{ recipe: 'build' }]);
  });

  it('取消关闭面板且不发请求;空值字段不进 args', async () => {
    await mountConsole();
    const card = screen.getAllByText('hello').map(e => e.closest('.group')).find(Boolean) as HTMLElement;
    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /启动/ }));
    const panel = await screen.findByTestId('param-panel');
    fireEvent.click(within(panel).getByRole('button', { name: '取消' }));
    expect(screen.queryByTestId('param-panel')).toBeNull();
    expect(startBodies).toHaveLength(0);

    // 再次打开,留空提交 → args 不含空值字段
    fireEvent.click(within(card as HTMLElement).getByRole('button', { name: /启动/ }));
    const panel2 = await screen.findByTestId('param-panel');
    fireEvent.click(within(panel2).getByRole('button', { name: '启动' }));
    await act(async () => { await Promise.resolve(); });
    expect(startBodies).toEqual([{ recipe: 'hello' }]);
  });
});

describe('LogViewer 带参启动面板 — 单任务视图', () => {
  it('选中带参 recipe(未运行)点「启动」弹面板,提交携带 args', async () => {
    render(<LogViewer />);
    const es = FakeES.instances.at(-1)!;
    act(() => { es.onopen?.(); });
    act(() => { es.onmessage?.({ data: JSON.stringify({ type: 'state', recipe: 'hello', state: 'exited', code: 0, startedAt: Date.now() }) }); });
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: /重跑/ }));
    const panel = await screen.findByTestId('param-panel');
    fireEvent.change(within(panel).getByLabelText('msg'), { target: { value: 'world' } });
    fireEvent.click(within(panel).getByRole('button', { name: '启动' }));
    await act(async () => { await Promise.resolve(); });
    expect(startBodies).toEqual([{ recipe: 'hello', args: { msg: 'world' } }]);
  });
});
