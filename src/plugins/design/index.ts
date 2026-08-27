/**
 * design server 侧:definePlugin 接入(manifest.config 单源读取 folders)。
 * /__design/assets 响应形状(ScanResult)保持不变。
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

function mergeScanResults(a: ScanResult, b: ScanResult): ScanResult {
  const out = {} as ScanResult;
  for (const k of ASSET_KEYS) {
    out[k] = [...a[k], ...b[k]];
  }
  return out;
}

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    ctx.route('/__design/assets', async () => {
      const { folders } = ctx.config<{ folders?: string[] }>();
      const list = Array.isArray(folders) ? folders : [];

      if (list.length === 0) {
        // 契约默认目录:zdesign 等 skill 统一产出到 <root>/.zdev/design/(walkDir 跳过点目录,扫根看不见)
        const designRoot = path.join(root, '.zdev', 'design');
        return fs.existsSync(designRoot) ? scanAssets(designRoot) : scanAssets(root);
      }

      let merged = emptyScan();
      for (const folder of list) {
        const folderPath = path.resolve(root, folder);
        if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
          merged = mergeScanResults(merged, scanAssets(folderPath));
        }
      }
      return merged;
    });
  },
});
