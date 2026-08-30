/**
 * T1 提示词模板与最近记录验收:
 * - 三市场模板(Logo 品牌插值/动效源码内嵌/灵感用户补充段);
 * - 最近记录环形:>5 截断、最新在前、localStorage 持久。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  logoPrompt,
  motionPrompt,
  inspirationPrompt,
  recordPromptHistory,
  loadPromptHistory,
  PROMPT_HISTORY_LIMIT,
} from '../prompt.js';

beforeEach(() => {
  localStorage.clear();
});

describe('三市场提示词模板', () => {
  it('logo:品牌名插值 + 商标合规红线句', () => {
    const text = logoPrompt({ name: 'React' });
    expect(text).toContain('React');
    expect(text).toContain('单色几何风格');
    expect(text).toContain('仅风格参考,不得复制商标');
  });

  it('logo:subject 可覆盖品牌/行业位,缺省回退 name', () => {
    expect(logoPrompt({ name: 'React', subject: 'AI 编程工具' })).toContain('为 AI 编程工具 设计一个 Logo');
    expect(logoPrompt({ name: 'React' })).toContain('为 React 设计一个 Logo');
  });

  it('motion:名称/描述插值,CSS 源码原样内嵌', () => {
    const css = '.animate__bounce{animation:bounce 1s infinite}';
    const text = motionPrompt({ name: '弹跳', desc: '上下弹跳强调', css });
    expect(text).toContain('弹跳');
    expect(text).toContain('上下弹跳强调');
    expect(text).toContain(css);
    expect(text).toContain('prefers-reduced-motion');
  });

  it('inspiration:名称/URL/标签插值,含用户补充段', () => {
    const text = inspirationPrompt({
      name: 'Excalidraw',
      url: 'https://excalidraw.com',
      tags: ['白板', '手绘风'],
      extra: '暗色模式优先,画布要流畅',
    });
    expect(text).toContain('Excalidraw');
    expect(text).toContain('https://excalidraw.com');
    expect(text).toContain('白板');
    expect(text).toContain('暗色模式优先,画布要流畅');
  });

  it('inspiration:补充为空时要求段落给占位语义,不产生空句子', () => {
    const text = inspirationPrompt({ name: 'Excalidraw', url: 'https://excalidraw.com', tags: [], extra: '' });
    expect(text).toContain('Excalidraw');
    expect(text).toContain('无特殊要求');
    expect(text).not.toContain('特征 ;');
    expect(text).not.toContain(';要求 ;');
  });
});

describe('最近提示词记录(localStorage 环形)', () => {
  it('记录一条后可读回,字段完整', () => {
    const out = recordPromptHistory({ market: 'logos', text: '第一条' });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ market: 'logos', text: '第一条' });
    expect(typeof out[0].at).toBe('number');
    expect(loadPromptHistory()).toHaveLength(1);
  });

  it(`超过 ${PROMPT_HISTORY_LIMIT} 条截断,最新在前`, () => {
    for (let i = 1; i <= 7; i++) {
      recordPromptHistory({ market: 'motions', text: `提示词-${i}` });
    }
    const hist = loadPromptHistory();
    expect(hist).toHaveLength(PROMPT_HISTORY_LIMIT);
    expect(hist[0].text).toBe('提示词-7');
    expect(hist[4].text).toBe('提示词-3');
  });

  it('持久化:reload 后仍在', () => {
    recordPromptHistory({ market: 'inspirations', text: '持久化样本' });
    expect(loadPromptHistory().map((r) => r.text)).toContain('持久化样本');
  });
});
