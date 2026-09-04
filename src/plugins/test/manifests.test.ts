/**
 * 内置插件 manifest 契约(design.md「URL 参数契约」表驱动):
 * 每插件 manifest.ts 单源 —— manifest 字段完整 + params schema 与契约表一致。
 * 一例数据断言全部内置插件;新增插件须在此表登记。
 */
import { describe, it, expect } from 'vitest';
import type { PluginManifest } from '../../core/manifest.js';
import type { ParamSchema } from '../../sdk/shared.js';

import { manifest as statsManifest, params as statsParams } from '../stats/manifest.js';
import { manifest as viewManifest, params as viewParams } from '../view/manifest.js';
import { manifest as designManifest, params as designParams } from '../design/manifest.js';
import { manifest as justManifest, params as justParams } from '../just/manifest.js';

/** design.md 契约表:mode → 参数名(有序) */
const CONTRACT: Record<string, { manifest: PluginManifest; params: ParamSchema; order: number }> = {
  stats: { manifest: statsManifest, params: statsParams, order: 10 },
  view: { manifest: viewManifest, params: viewParams, order: 20 },
  design: { manifest: designManifest, params: designParams, order: 30 },
  just: { manifest: justManifest, params: justParams, order: 50 },
};

describe('内置插件 manifest 单源契约', () => {
  it('字段完整:mode/label/icon/description/order 齐备且与契约表一致', () => {
    for (const [mode, entry] of Object.entries(CONTRACT)) {
      expect(entry.manifest.mode, mode).toBe(mode);
      expect(entry.manifest.label.length, `${mode}.label`).toBeGreaterThan(0);
      expect(entry.manifest.icon.length, `${mode}.icon`).toBeGreaterThan(0);
      expect(entry.manifest.description?.length, `${mode}.description`).toBeGreaterThan(0);
      expect(entry.manifest.order, `${mode}.order`).toBe(entry.order);
    }
  });

  it('params 与 design.md URL 参数契约表一致(view=wt/file/filter,just=recipe/task,design=asset,stats=card)', () => {
    expect(names(statsParams)).toEqual(['card']);
    expect(names(viewParams)).toEqual(['wt', 'file', 'filter']);
    expect(names(justParams)).toEqual(['recipe', 'task']);
    expect(names(designParams)).toEqual(['asset']);
  });

  it('params 字段类型均为 string 且带 label 便于 UI 提示', () => {
    for (const entry of Object.values(CONTRACT)) {
      for (const p of entry.params) {
        expect(p.type ?? 'string', `${entry.manifest.mode}.${p.name}.type`).toBe('string');
        expect(p.label?.length, `${entry.manifest.mode}.${p.name}.label`).toBeGreaterThan(0);
      }
    }
  });

  it('design 约定化后不再声明 config(schema 为空对象,/__plugins/config 不再返回 design 段)', () => {
    // 扫描目录改为约定常量 <root>/.zdev/design,配置链路整体拆除
    expect(designManifest.config ?? {}).toEqual({});
  });

  it('view 约定化后不再声明 config(schema 为空对象,/__plugins/config 不再返回 view 段)', () => {
    // 扫描目录改为 core/tree.ts 约定常量 ['openspec','docs'],配置链路整体拆除
    expect(viewManifest.config ?? {}).toEqual({});
  });
});

function names(params: ParamSchema): string[] {
  return params.map((p) => p.name);
}
