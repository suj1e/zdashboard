/**
 * design server 侧:definePlugin 接入(约定化扫描)。
 * 恒扫 <root>/.zdev/design(zdesign 等 skill 统一产出目录,walkDir 跳过点目录扫根看不见);
 * 目录缺失 → emptyScan() 全组空数组。/__design/assets 响应形状(ScanResult)保持不变。
 * 另供只读代理 /__design/asset?path=<rel-to-.zdev/design>,viewers 由此加载资产(直取根路径必 404)。
 */
import path from 'node:path';
import fs from 'node:fs';
import { MIME } from '../../core/server.js';
import { scanAssets, type ScanResult, type AssetType } from '../../server/design-assets.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

const ASSET_KEYS: AssetType[] = ['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font', 'diagram'];

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

    // 只读资产代理:三重防御钉死任意读(字符拒绝 → join 归一化 → 前缀校验),先例 /__file-content
    ctx.route('/__design/asset', async (req, res) => {
      const rel = new URL(req.url || '/', 'http://localhost').searchParams.get('path') ?? '';
      if (!rel || rel.includes('..') || rel.includes('\\') || path.isAbsolute(rel)) {
        res.writeHead(400);
        res.end('bad path');
        return;
      }
      const designRoot = path.join(root, '.zdev', 'design');
      const filePath = path.join(designRoot, rel);
      if (!filePath.startsWith(designRoot + path.sep)) {
        res.writeHead(400);
        res.end('bad path');
        return;
      }
      fs.stat(filePath, (err) => {
        if (err) { res.writeHead(404); return res.end('Not found'); }
        const ct = MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-cache' });
        // stat 通过后文件仍可能被删,流错误无人接会崩进程(与 core/server serveFile 同款兜底)
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => { try { res.destroy(); } catch { /* 已断 */ } });
        stream.pipe(res);
      });
    });
  },
});
