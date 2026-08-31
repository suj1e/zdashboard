## Why

首屏体验两连击：①主 bundle **1.45MB** eager——`icons.tsx` 的 `import * as lucide from 'lucide-react'` + `import * as pixelReact from 'pixelarticons/react/index.js'` 命名空间动态索引彻底杀死 tree-shaking，全量图标库进首屏 chunk（vite 500KB 警告来源，产物中 lucide 图标名出现 1547 次）；②深色用户**每次冷启动闪浅色**（data-mode/data-theme 在 JS bundle 执行时才写入，无 FOUC 防护）。白屏期 + 闪屏叠加，第一观感最差的两秒。

## What Changes

- **图标按需导入**：`icons.tsx` 改为按 `ICON_MAP` 实际引用的图标具名导入（lucide 深路径或聚合具名 import），pixelarticons 同规则；删除命名空间动态索引
- **vendor 拆分**：`vite.config.ts` 增加 `build.rollupOptions.output.manualChunks`（react 系/渲染系分 chunk）
- **FOUC 防护**：`index.html` `<head>` 加 3 行内联脚本——从 localStorage 读 `zd-mode`/`zd-theme` 直接写 `documentElement.dataset`（含 legacy 键迁移与非法值兜底）
- 验证 ICON_MAP 全量图标在按需导入后仍可渲染（缺 import 的键在开发期即报 undefined）

## 成功标准

1. `dist/web/assets/index-*.js` 体积较改前下降 ≥50%（目标 <700KB）
2. 深色模式冷启动无浅色闪屏（内联脚本先于 CSS 渲染生效）
3. 全部主题（default/slate/pixel）× 明暗下图标渲染无缺失
4. `pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 依赖

无前置。

## 优先级

- P1：收益/成本比最高（3 行脚本 + 一次导入改造，白屏与闪屏直接消失）。
