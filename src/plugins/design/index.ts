import type { Context } from 'cordis';
import path from 'node:path';
import fs from 'node:fs';
import { scanAssets, type ScanResult, type AssetType } from '../../server/design-assets.js';

const ASSET_KEYS: AssetType[] = ['page','component','icon','token','md','video','audio','pdf','font'];

function mergeScanResults(a: ScanResult, b: ScanResult): ScanResult {
  const out: ScanResult = {} as ScanResult;
  for (const k of ASSET_KEYS) {
    out[k] = [...a[k], ...b[k]];
  }
  return out;
}

export const apply = {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({
        mode: 'design',
        label: '设计资产',
        icon: '🎨',
        description: '页面/组件/图标/Token 分类预览',
        config: {
          folders: { type: 'string[]', label: '扫描文件夹', default: [] },
        },
      });

      ctx.server.route('/__design/assets', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        const designConfig = ctx.dashboard.getConfig('design') as { folders?: string[] } | undefined;
        const folders = Array.isArray(designConfig?.folders) ? designConfig.folders : [];

        if (folders.length === 0) {
          // 契约默认目录:zdesign 等 skill 统一产出到 <root>/.zdev/design/(walkDir 跳过点目录,扫根看不见)
          const designRoot = path.join(root, '.zdev', 'design');
          res.end(JSON.stringify(fs.existsSync(designRoot) ? scanAssets(designRoot) : scanAssets(root)));
          return;
        }

        let merged: ScanResult = {} as ScanResult;
        for (const k of ASSET_KEYS) merged[k] = [];

        for (const folder of folders) {
          const folderPath = path.resolve(root, folder);
          if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
            const result = scanAssets(folderPath);
            merged = mergeScanResults(merged, result);
          }
        }

        res.end(JSON.stringify(merged));
      });
    });
  },
};
