/**
 * design server 侧:definePlugin 接入(约定化扫描)。
 * 恒扫 <root>/.zdev/design(zdesign 等 skill 统一产出目录,walkDir 跳过点目录扫根看不见);
 * 目录缺失 → emptyScan() 九组空数组。/__design/assets 响应形状(ScanResult)保持不变。
 */
import path from 'node:path';
import fs from 'node:fs';
import { scanAssets, type ScanResult, type AssetType } from '../../server/design-assets.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

const ASSET_KEYS: AssetType[] = ['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font'];

function emptyScan(): ScanResult {
  const out = {} as ScanResult;
  for (const k of ASSET_KEYS) out[k] = [];
  return out;
}

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    ctx.route('/__design/assets', async () => {
      const designRoot = path.join(root, '.zdev', 'design');
      return fs.existsSync(designRoot) ? scanAssets(designRoot) : emptyScan();
    });
  },
});
