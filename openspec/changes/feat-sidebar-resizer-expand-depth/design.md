# 设计:侧边栏拖拽调宽(feat-sidebar-resizer-expand-depth)

> 快车道:需求单一、改动面 1-2 文件(SidebarFrame.tsx)、无新依赖。范围经用户两次收敛:**仅 splitter**,展开深度配置与树交互改动均砍掉。

## 现有系统分析

- `--sidebar-w: 280px`(globals.css:45)静态变量;SidebarFrame 桌面展开态 `sm:w-[var(--sidebar-w)]`,移动抽屉 `w-[calc(var(--sidebar-w)*0.78)]`,折叠/展开由状态切换类名;开合状态按 mode 存 localStorage。

## 方案设计

- 桌面展开态右缘渲染 6px 把手:`cursor-col-resize`,hover/拖拽中高亮(`bg-primary/20`,语义 token)。
- 交互:pointerdown 捕获 → pointermove 实时写容器 inline `--sidebar-w`(px)→ pointerup 持久化 `localStorage['zd-sidebar-w']`;**双击把手**恢复 280 并清除持久化键。
- clamp:**220–480px**(MIN_SIDEBAR_W / MAX_SIDEBAR_W / DEFAULT_SIDEBAR_W 命名常量,默认值与 CSS 变量同源)。
- 作用域:仅桌面展开态渲染把手;移动抽屉(< sm)与折叠态不渲染,宽度不影响二者既有比例(抽屉仍 0.78 比例)。
- 首渲染防闪烁:useState 惰性初始化读 localStorage,非法值忽略回退 280。
- 键盘可达:`role="separator"` + `aria-orientation="vertical"` + tabIndex,←/→ ±16px(KEYBOARD_STEP)。

## 接口 / 数据契约

- `localStorage['zd-sidebar-w']`:数字字符串;无旧键迁移。

## 实施步骤

1. SidebarFrame:把手 + pointer 拖拽 + clamp + 双击重置 + localStorage + 键盘;组件测试。
2. 回归:typecheck/test/build + 手工冒烟。

## 风险与 Trade-off

- 拖拽重排:pointermove 直接写 CSS 变量,量级无碍,不做 rAF 节流(YAGNI)。
- 折叠/展开动画与 inline 变量并存:折叠态宽度由类名控制,恢复展开读回持久化值,无冲突。
- 回归面:SidebarFrame 既有开合/移动抽屉测试必须全绿。

## 测试策略

1. **组件(vitest + testing-library)**:
   - pointerdown→move 容器 `--sidebar-w` 跟随;pointerup 后 localStorage 写入;
   - 越界 clamp 到 220/480;双击恢复 280 且清 localStorage;
   - 小视口(sm 以下)不渲染把手;折叠态不渲染把手;
   - 键盘 ←/→ ±16px。
2. **手工冒烟**:拖拽顺滑度、三主题×明暗把手可见性、移动端抽屉无把手、刷新持久。
3. **回归**:基线全量测试(typecheck/test/build)不回归;`?p=view` 深链接、过滤、worktree 分组折叠行为不变。

## 上线与人工动作

- 无。
