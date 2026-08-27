/**
 * apply server 侧:definePlugin 接入(manifest 单源)。
 * /__apply、/__apply/change 路由与响应形状保持不变。
 */
import { scanApplyChanges, readApplyChange } from './scan.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    ctx.route('/__apply', async () => scanApplyChanges(root));

    ctx.route('/__apply/change', async (req, res) => {
      const url = new URL(req.url || '', 'http://x');
      const name = url.searchParams.get('name');
      const bad = (msg: string) => {
        // 响应形状保持迁移前:400 + {error}
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: msg }));
        return undefined;
      };
      if (!name) return bad('missing name');
      if (name.includes('..') || name.includes('/') || name.includes('\\')) return bad('invalid name');
      try {
        return readApplyChange(root, name);
      } catch (e) {
        return bad(e instanceof Error ? e.message : 'unknown error');
      }
    });
  },
});
