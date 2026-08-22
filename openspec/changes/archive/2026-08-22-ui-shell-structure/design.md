# Design: Shell 双槽结构 + stats 内置 + UI 修正

## Context

六条用户反馈（侧栏折叠回归、view 不居中、design 代码噪音、bugs/apply 手机屏、just 全出血、stats 转正）的共同根因：内容区容器是插件各自的约定。本设计把它升级为 Shell 结构。

## 1. Shell 双槽结构

### 插件契约（web.tsx）

```ts
export default {
  mode: 'view', label: '项目浏览', icon: '👁️',
  Sidebar: lazy(() => import('./Sidebar')),    // 新增可选槽
  Workspace: lazy(() => import('./Workspace')), // 只交内容卡
} satisfies WebPlugin;
```

`WebPlugin` 类型（src/web/lib/plugins.ts）加 `Sidebar?: LazyExoticComponent`。

### App.tsx Shell 布局

```
<Topbar/>
<div flex>
  <IconRail/>
  {plugin?.Sidebar && <SidebarFrame mode={mode}>   ← Shell 渲染
     <plugin.Sidebar/>
     <CollapseChevron/>
     <HoverZone/>   ← 折叠态 8px 热区
  </SidebarFrame>}
  <section className="flex-1 p-6" style={dotBg}>   ← Content 槽：结构性 dotBg + p-6
     <Suspense><plugin.Workspace/></Suspense>
  </section>
</div>
<StatusBar/>
```

### SidebarFrame 组件（src/web/layout/SidebarFrame.tsx）

- 折叠状态：`useState(open)` + localStorage `zd-sidebar-<mode>`（默认展开）
- chevron 按钮：侧栏右缘垂直居中，折叠/展开切换
- 折叠态：`w-0` 隐藏 + `absolute left-0 top-0 h-full w-1.5` 热区，hover 时侧栏以 overlay（absolute + shadow）临时滑出，`onMouseLeave` 收回；临时展开不改 localStorage 状态
- 移动端（sm 以下）：侧栏 fixed + 遮罩，行为沿用现有 view/design 树的移动处理（收进 SidebarFrame 统一实现，插件侧栏不再自带 fixed/translate 逻辑）

### 各插件迁移

| 插件 | Sidebar 槽 | Workspace（内容卡） |
|------|-----------|---------------------|
| view | FileTree（去掉自身 fixed/折叠逻辑） | Md/Image/Code viewer 卡片，max-w-5xl |
| design | 资产分类树（从 DesignViewer 抽出） | 视口工具栏 + 预览卡（页面类按视口宽，其他 max-w-5xl）；去掉自带 dotBg/p-6 |
| bugs | — | 筛选条 + 表格卡，max-w-6xl |
| apply | — | change 卡片网格，max-w-6xl |
| just | — | 终端卡 max-w-6xl（LogViewer 去掉 h-full 全出血，改卡片式） |
| review | — | 现有结构，容器交给 Shell |
| stats（新） | — | 统计卡片 + 条形图，max-w-6xl |

卡片统一风格：`mx-auto h-full bg-background border rounded-lg shadow-sm overflow-hidden`（沿用现有 design 卡片样式）。

## 2. stats 内置化

- `src/plugins/stats/index.ts`：cordis 插件（inject ['server','dashboard']），`/__stats/data` 路由 + manifest 注册（scan 逻辑从 examples/stats/index.ts 迁入，复用其 walk/统计实现）
- `src/plugins/stats/web.tsx` + `Workspace.tsx`：examples/stats/web/index.html 的深色页改写为 React + tailwind（卡片网格 + Top10 条形 + 徽标行）
- 排序：`src/web/lib/plugins.ts` 的 `ORDER` 首位插入 `'stats'`（view 之前）
- cli.ts 挂载列表加 stats

## 3. design 去代码分组

`src/server/design-assets.ts`：
- `categorize()` 删除 `code` 归类：CODE_EXTS 文件（除 token 识别外）**直接跳过不收录**
- `AssetType` 与前端 `GROUPS` 同步移除 `'code'`（design 插件的分组列表）
- 「其他」组保留（justfile 等无扩展名文件），不在本次范围

## 4. examples 换便签插件

删除 `examples/stats/`，新增 `examples/notes/`：
- `index.ts`：`GET /__notes/data`（读 `<root>/.zdashboard-notes.json`）+ `POST /__notes/save`（stopToken 鉴权，写回文件）；manifest 注册 mode `notes`
- `web/index.html`：便签列表（添加/勾选完成/删除），fetch 读写，样式与 stats 示例同风格（深色）
- README 示例章节对应更新

## 5. 测试与验证

- vitest 既有 9 项保持绿；可为 SidebarFrame 折叠记忆加 1 个组件测试（localStorage mock）
- 冒烟：起服务逐工作区核对（stats 首位、view/design 侧栏折叠与记忆、hover 临时展开、bugs/apply/just 容器、design 无代码分组、notes 示例 POST 读写）
- 浏览器走查同上

## 明确不做

- 多级侧栏/侧栏 pin 常驻（hover 临时展开已覆盖临时查看）
- design「其他」组清理（另行反馈）
- 外部插件声明 Sidebar 槽（iframe 方案无侧栏需求）
