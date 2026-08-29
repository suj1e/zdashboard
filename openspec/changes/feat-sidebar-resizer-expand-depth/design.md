# 设计:侧边栏拖拽调宽 + 默认展开深度可配置(feat-sidebar-resizer-expand-depth)

> 快车道:根因明确(静态 CSS 变量 / 服务端硬编码 2)、改动面小(SidebarFrame/view Sidebar/view manifest/core tree)、无新依赖。影响面与回归说明见「测试策略」与「风险」。

## 现有系统分析

- 宽度:`--sidebar-w: 280px`(globals.css:45)静态;SidebarFrame 桌面展开态 `sm:w-[var(--sidebar-w)]`,移动抽屉 `w-[calc(var(--sidebar-w)*0.78)]`,折叠态不受该变量影响。
- 展开深度:`core/tree.ts` 的 `/__files` 调 `scanTree(root, dirs)` 未传 opts → `spec-scan.ts` 默认 `defaultExpandDepth = 2`(深度 > 2 的目录 `defaultCollapsed: true`);`ScanTreeOptions.defaultExpandDepth` 已存在但无人传。
- 配置设施:`.zdev/dashboard.json` 的 `plugins.<mode>` 段;`GET /__plugins/config` 读、`POST /__plugins/config`(x-stop-token)写;`server.getPluginConfig(mode)` 服务端同步读;manifest.config 声明 schema(供 /__plugins 暴露)。v2.8.0 已删除内置插件的配置面板 UI(ConfigField/usePluginConfig)。
- 前端写配置可用既有 `src/web/lib/stop-token.ts` 的 `getStopToken()`。

## 方案设计

### A. 侧边栏拖拽调宽(SidebarFrame.tsx)

- 桌面展开态右缘渲染 6px 把手(`cursor-col-resize`,hover/拖拽中高亮,语义 token:bg-transparent hover:bg-primary/20)。
- 交互:pointerdown 捕获 → pointermove 实时把新宽度写入容器 inline style `--sidebar-w`(px)→ pointerup 持久化 `localStorage['zd-sidebar-w']`;**双击把手**恢复默认 280 并清除持久化。
- clamp:**220–480px**;边界内跟随,越界钳制。
- 作用域:仅桌面展开态渲染把手;移动抽屉(< sm)与折叠态不渲染,宽度不影响二者既有比例。SSR/首次渲染读 localStorage 前 siempre 280(避免闪烁;localStorage 读取放 useState 惰性初始化)。
- 键盘可达:把手为 `role="separator"` + `aria-orientation="vertical"`,←/→ 键 ±16px(加分项,成本低)。

### B. 默认展开深度可配置(view 插件)

1. `view/manifest.ts` 增加:
   ```ts
   config: { defaultExpandDepth: { type: 'select', label: '默认展开深度', default: 2,
     options: [{value:'1',label:'1 层'},{value:'2',label:'2 层(默认)'},{value:'3',label:'3 层'},{value:'4',label:'4 层'}] } }
   ```
2. `core/tree.ts` `/__files` 路由:`const depth = Number(this ctx.server.getPluginConfig('view').defaultExpandDepth ?? 2)`(NaN 兜底 2,clamp 1–4)→ `scanTree(root, dirs, { defaultExpandDepth: depth })`。
3. view Sidebar 底部新增轻量「展开深度」select(⚙ 区,现 Sidebar 底部 config 区已有先例则并入):
   - 初始值:GET `/__plugins/config` 取 `view.defaultExpandDepth`(缺省 2);
   - 保存:POST `/__plugins/config`(header `x-stop-token: await getStopToken()`,body `{ view: { defaultExpandDepth } }`,以服务端实际契约为准,实施时对齐 manifest.ts 路由的 body 形状);
   - 保存成功后重新拉取 `/__files`(SSE config 事件已有广播则依赖之,否则直接 refetch)。
4. 深度变化语义:仅影响 `defaultCollapsed` 标记(下次树渲染生效),不展开用户手动折叠过的节点(本地 state 不重置,可接受;报告注明)。

## 接口 / 数据契约

- `POST /__plugins/config`:body 形状以 manifest.ts 现路由为准(实施时核对:预计 `{ [mode]: { [key]: value } }` 增量或全量);必须带 `x-stop-token`。
- `localStorage`:新增键 `zd-sidebar-w`(数字字符串);不迁移旧键(无旧键)。
- `/__files` 响应形状不变(tree 结构内 defaultCollapsed 分布随配置变化)。

## 实施步骤

1. SidebarFrame:把手 + pointer 拖拽 + clamp + 双击重置 + localStorage + 键盘;组件测试(模拟 pointer 事件拖拽断言宽度持久化/双击重置/clamp)。
2. view manifest.config + tree.ts 读取透传 + 单测(路由含 defaultCollapsed 深度随配置变化;NaN/越界兜底)。
3. view Sidebar 深度 select + GET/POST 配置 + 保存后 refetch;组件测试(mock fetch:初始值渲染、保存调用带 stop-token、保存后 refetch)。
4. 回归:`pnpm typecheck && pnpm test && pnpm build` 全绿;手工冒烟三主题×明暗 + 移动宽度断点。

## 风险与 Trade-off

- 拖拽期间 resize 触发内容重排——pointermove 里直接写 CSS 变量为 GPU 友好的宽度类操作,量级无碍;不做 rAF 节流(YAGNI,实测卡再做)。
- 折叠/展开动画与 inline `--sidebar-w` 并存:折叠态宽度由类切换控制,恢复展开读回持久化值,无冲突。
- 深度配置只影响初始标记、不重置用户手动折叠——记录为已知行为。
- 回归面:SidebarFrame 既有开合/移动抽屉测试、tree-files 既有测试必须全绿。

## 测试策略

1. **单元/组件(vitest + testing-library)**:
   - SidebarFrame:模拟 pointerdown→move(up 前)容器 `--sidebar-w` 跟随;pointerup 后 localStorage 写入;越界值 clamp 到 220/480;双击恢复 280 且清 localStorage;移动视口(sm 以下)不渲染把手;键盘 ←/→ 调宽。
   - tree 路由:配置 defaultExpandDepth=3 时第三层目录不再 defaultCollapsed;=1 时第一层以上全折叠;非法值(abc/99)兜底 2。
   - view Sidebar 深度 select:初始值渲染、change 触发 POST(body/header 断言)、成功后 refetch /__files、失败 toast 不 refetch。
2. **手工冒烟**:拖拽顺滑度、三主题×明暗把手可见性、移动端抽屉无把手、深度 1/2/3/4 四档树初始展开观感、配置保存后刷新持久。
3. **回归**:基线全量测试(typecheck/test/build)不回归;`?p=view` 深链接、过滤、worktree 分组折叠行为不变。

## 上线与人工动作

- 无(纯代码交付;配置由用户在 UI 自行调)。
