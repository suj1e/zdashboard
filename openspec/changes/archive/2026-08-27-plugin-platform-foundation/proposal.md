# 提案:插件平台地基(plugin-platform-foundation)

## 需求复述

zdashboard 插件体系一次性重写的第一个 change:搭建全部插件页面赖以存在的地基——统一 SDK(definePlugin / defineWebPlugin)、searchParams 正经 URL 路由、平台组件库(kit)、PluginPage 统一页面模板、usePluginData 数据层与插件级 SSE 事件频道。cordis 内核与思想保留,SDK 是内核之上的受控封装。

本 change 是 `plugin-platform-plugins`(六插件重写)与 `plugin-platform-bridge-cleanup`(桥接+清理)的共同前置;本 change 合入后两个下游 change 可并行实施。

## 要解决的问题

1. **UX 无体系**:六插件页面结构各异,无统一标题区/工具栏/三态(加载/空/错误)处理,视觉不成体系 → PluginPage 模板 + kit 组件库。
2. **路由机制粗暴**:hash + 内存状态,刷新丢状态、无法深链接;跨插件跳转靠 `zd-dashboard-nav` CustomEvent + `Date.now()` navToken 强制重挂载 → searchParams URL 路由,params 变化只重渲染。
3. **元数据双份维护**:每个插件 server manifest 与 web.tsx 各写一遍 label/icon/description,已漂移(just 两处不一致)→ manifest 单一来源,两端 import 同一份常量。
4. **配置 schema 三处声明**:manifest.config、插件私有 SCHEMA、usePluginConfig 类型,view 的 hiddenDirs 声明了没消费 → schema 只在 manifest.config 声明,SDK 类型化下发。
5. **cordis 四种写法并存**:direct register / 双层 inject / 双保险强转+静默失败 → definePlugin 唯一姿势。
6. **路由层无抽象**:全仓约 25 处手写 writeHead 样板;POST 鉴权(stop-token)覆盖不齐 → route()/guardedRoute() 助手。
7. **数据获取范式分裂**:fetch-once / SSE / 轮询并存 → usePluginData(fetch+缓存+SSE 失效)统一;ReloadService 增插件事件频道。
8. **web.tsx 假 lazy**:静态 import 破坏 5 个插件分包 → defineWebPlugin 强制 lazy。
9. **探测数据搭便车**:HomeGrid 的 Detects 搭 `/__files` 文件树响应返回 → 独立 `/__detect` 路由。

## 成功标准

1. `src/sdk/` 落地 server.ts / client.tsx / shared.ts;`definePlugin` 注册的插件在 `/__plugins` 可见,manifest 为元数据唯一声明点。
2. URL 路由生效:`/?p=<mode>&k=v` 直开/刷新/后退/前进全部正确;`zd-dashboard-nav`、navTarget、navToken、hash 路由代码全部删除。
3. kit 组件库 ≥10 个组件落地并接现有 CSS 变量 token;三套主题(default/nord/pixel)+ 明暗切换下渲染正常。
4. PluginPage 模板统一渲染 PageHeader + AsyncBoundary 三态;旧插件经兼容路径仍可显示(本 change 不重写插件内容)。
5. usePluginData 缓存/去重/SSE 失效有单测;`plugin:<mode>:<event>` SSE 频道可用。
6. `/__detect` 独立返回四探测位;HomeGrid 改走新路由。
7. `pnpm build` + `pnpm test` 绿;六插件旧页面在新壳层下无 console error(功能重写下个 change)。

## 依赖

- 无前置 change;基于 main(2026-08-27 删除 bugs/review 之后)。

## 优先级

- P1:地基先行——plugins/bridge-cleanup 两个 change 的全部工作都踩在本 change 交付的 SDK/路由/组件库上,必须最先合入。
