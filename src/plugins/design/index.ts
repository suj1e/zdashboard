/**
 * design server 侧:definePlugin 接入(目录浏览器模式)。
 * 恒扫项目根下 prototypes 与 design 两目录(zdesign/zscenario 等 skill 产出,walkDir 跳过点目录扫根看不见),
 * 返回目录树(形状同 view /__files:分组节点名 `${dir} (${n})`,文件路径为根相对);两目录均缺失 → 空树。
 * 资产文件由前端按根相对路径直取(/__file-content),无需专用代理。
 */
import { scanTree } from '../../server/spec-scan.js';
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

/** 生态约定:项目根下固定扫描目录,非用户可配 */
const SCAN_DIRS = ['prototypes', 'design'] as const;

export const apply = defineBuiltin({
  manifest,
  setup(ctx, root) {
    ctx.route('/__design/assets', async () => {
      return { tree: scanTree(root, [...SCAN_DIRS], { defaultExpandDepth: 2 }) };
    });
  },
});
