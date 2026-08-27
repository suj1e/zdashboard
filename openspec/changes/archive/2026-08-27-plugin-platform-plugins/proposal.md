# 提案:六插件迁移与页面重写(plugin-platform-plugins)

## 需求复述

插件体系重写第二个 change:把六个内置插件(stats / view / apply / design / just / apply-batch)全部迁移到 plugin-platform-foundation 交付的 SDK(definePlugin / defineWebPlugin),并按统一模板(PluginPage + kit)重写各自页面。UX 骨架为精装三段式;apply 与 apply-batch 分开保留;stats 卡片做实跨插件钻取;just 升级多任务并发视图。

## 要解决的问题

1. 六插件页面结构/交互/视觉各自为政,无统一标题区/工具栏/三态 → 全部套 PluginPage + kit。
2. 六插件的 server 侧路由手写 writeHead 样板、apply-batch 十条路由中 approve/pause/resume/retry 无 stop-token 鉴权 → 迁 SDK route/guardedRoute,鉴权缺口关闭。
3. apply-batch 前端 2 秒轮询且 import server store(只为类型)→ 切 `plugin:apply-batch:state` SSE,store 引用改 import type。
4. 插件内状态不入 URL(wt/file/filter/change 等),刷新丢失 → 全部参数入 URL(契约见 design.md)。
5. stats 卡片钻取是死代码(navTarget 机制已废)→ 用 URL navigate 做实。
6. just 仅单任务视图 → 多任务并发视图(活跃任务侧栏)。
7. design 的 PageViewer/TokenViewer 内联在 Workspace 里 → 拆独立文件;配置多文件夹迁 manifest.config 单源。

## 成功标准

1. 六插件 server 侧全部 `definePlugin`、前端全部 `defineWebPlugin`;manifest.ts 单源;旧兼容分支删除,`grep -rn "兼容分支" src/web/lib/plugins.ts` 无结果。
2. 六页面均为 PluginPage 模板 + kit 组件;三主题×明暗下渲染正常;加载/空/错误三态由 AsyncBoundary 呈现。
3. URL 参数契约全落地(见 design.md 参数表);深链接刷新/分享正确。
4. apply-batch:未带 token 的 POST /__apply-batch/approve 返回 403;store 变更 1s 内 UI 更新且 DevTools 无 2s 轮询请求。
5. stats:点 Worktree 卡 → `?p=view` 且 view 打开;点未提交卡 → view 高亮 dirty。
6. just:并发跑 2 个 recipe,侧栏两个活跃条目,日志互相独立。
7. `pnpm build` + `pnpm test` 绿;六页面手工走查零 console error。

## 依赖

- 前置:openspec/changes/plugin-platform-foundation/(SDK/路由/kit/数据层均来自该 change)

## 优先级

- P2:地基合入后的主体交付;bridge-cleanup 的冒烟覆盖本 change 产物,故须先于 P3。
