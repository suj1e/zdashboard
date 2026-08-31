# 任务:首屏优化

- [x] 1. icons.tsx 具名导入改造:按 ICON_MAP 清单具名 import,渲染索引改组件常量查表,dev 缺漏断言
  - 验收:ICON_MAP 渲染冒烟单测全绿;typecheck 0 error
- [ ] 2. vite manualChunks 拆 vendor;构建体积对比记录(改前 1.45MB → 目标 <700KB)
  - 验收:构建产物体积达标并记录在交付报告
- [ ] 3. index.html 内联主题脚本(读 zd-mode/zd-theme 写 dataset,含 legacy 迁移);内联逻辑抽纯函数补单测
  - 验收:深色冷启动无浅色闪屏(手验);单测覆盖非法值兜底
- [ ] 4. 🔧[人工] 三主题(default/slate/pixel)×明暗图标渲染走查,截图记录
  - 验收:无缺图标/无白块
- [ ] 5. 回归
  - 验收:`pnpm typecheck && pnpm test` 全绿(基线既有环境失败除外)
