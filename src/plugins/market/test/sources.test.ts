/**
 * T1 目录数据质量验收:三市场目录字段形状、量级、唯一性。
 * 数据真实性(simple-icons slug / animate.css、hover.css 类名)由 T6 冒烟对真实 CDN 校验。
 */
import { describe, it, expect } from 'vitest';
import { LOGOTYPES, type LogotypeEntry } from '../sources/logotypes.js';
import { MOTIONS, type MotionEntry } from '../sources/motions.js';
import { INSPIRATIONS, type InspirationEntry } from '../sources/inspirations.js';

const CATEGORIES = new Set([
  'tech', 'social', 'dev', 'cloud', 'finance', 'media', 'gaming', 'design', 'shopping', 'productivity', 'ai',
]);
const LIBS = new Set(['animate.css', 'hover.css']);

describe('logotypes 目录(simple-icons slug)', () => {
  it('量级 ~200(180–220)', () => {
    expect(LOGOTYPES.length).toBeGreaterThanOrEqual(180);
    expect(LOGOTYPES.length).toBeLessThanOrEqual(220);
  });

  it('字段形状 {id,name,category},id 即 slug(小写字母数字)', () => {
    for (const e of LOGOTYPES as LogotypeEntry[]) {
      expect(typeof e.id).toBe('string');
      expect(e.id).toMatch(/^[a-z0-9]+$/);
      expect(e.name.length).toBeGreaterThan(0);
      expect(CATEGORIES.has(e.category), `${e.id}: ${e.category}`).toBe(true);
    }
  });

  it('id 唯一', () => {
    expect(new Set(LOGOTYPES.map((e) => e.id)).size).toBe(LOGOTYPES.length);
  });

  it('覆盖全部类别', () => {
    expect(new Set(LOGOTYPES.map((e) => e.category)).size).toBeGreaterThanOrEqual(6);
  });
});

describe('motions 目录(animate.css / hover.css)', () => {
  it('量级 ~60(50–70)', () => {
    expect(MOTIONS.length).toBeGreaterThanOrEqual(50);
    expect(MOTIONS.length).toBeLessThanOrEqual(70);
  });

  it('字段形状 {id,name,desc,cls,lib};cls 为库内真实类名前缀', () => {
    for (const m of MOTIONS as MotionEntry[]) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.desc.length).toBeGreaterThan(0);
      expect(LIBS.has(m.lib), `${m.id}: ${m.lib}`).toBe(true);
      if (m.lib === 'animate.css') expect(m.cls).toMatch(/^animate__[a-z]+[A-Za-z]*$/);
      if (m.lib === 'hover.css') expect(m.cls).toMatch(/^hvr-[a-z-]+$/);
    }
  });

  it('(lib, cls) 组合唯一', () => {
    const keys = MOTIONS.map((m) => `${m.lib}:${m.cls}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('两库都有覆盖', () => {
    expect(MOTIONS.some((m) => m.lib === 'animate.css')).toBe(true);
    expect(MOTIONS.some((m) => m.lib === 'hover.css')).toBe(true);
  });
});

describe('inspirations 目录(开源站点/模式)', () => {
  it('量级 ~40(35–45)', () => {
    expect(INSPIRATIONS.length).toBeGreaterThanOrEqual(35);
    expect(INSPIRATIONS.length).toBeLessThanOrEqual(45);
  });

  it('字段形状 {id,name,desc,url,tags};url 为 https;tags 非空', () => {
    for (const s of INSPIRATIONS as InspirationEntry[]) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
      expect(s.url.startsWith('https://'), s.url).toBe(true);
      expect(s.tags.length).toBeGreaterThan(0);
    }
  });

  it('id 唯一', () => {
    expect(new Set(INSPIRATIONS.map((s) => s.id)).size).toBe(INSPIRATIONS.length);
  });
});
