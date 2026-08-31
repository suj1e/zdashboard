# 设计:just 日志体验

## 现有系统分析

- `LogViewer.tsx:72-79`：每条 log SSE 事件一次 `setLogs`；`:224` `key={i}` 索引 key；`:93` 每秒 forceTick 全量重渲；`:97-99` 无条件拽底；`:101-107` act 只 catch 网络异常
- `just-runner.ts:62`：`just --list` 解析时剥掉参数段；`:96` `spawn('just', [recipe])` 无参数
- `levelClass` 已识别 ERROR/WARN 级别但只用于着色；FilterPills 组件可复用

## 方案设计

### 方案 A:锚定 + 合批 + 传参闭环(选定)

**滚动锚定**：
- 容器 `onScroll` 记录 `atBottom = scrollHeight - scrollTop - clientHeight < 40`
- 自动跟随 effect 加 `atBottom &&` 条件；离开底部时显示浮动「↓ N 行新输出」按钮（计数 = 未读新增行数），点击回底并清零

**渲染合批**：
- SSE log 事件 push 进 `pendingRef`，rAF（降级 50ms timer）批量 `setLogs(prev => [...prev, ...batch].slice(-1000))`
- 行渲染抽 `LogLine = memo`，key 用单调递增 `seq`（随行存入，不受窗口滑动影响）
- elapsed 计时：forceTick 状态收敛到头部卡片组件（局部重渲），日志列表不参与

**搜索/过滤**：
- 工具行加搜索输入（防抖 150ms）+ 级别 FilterPills（全部/信息/警告/错误/成功）
- 过滤为渲染层派生（`useMemo` 过滤 selLines），不改存储；搜索命中行高亮 `<mark>`

**启停反馈**：
- `act()` 改 async：`res.ok` 检查，非 2xx 读 body error → `toast.error`；成功 `toast.success`（轻文案）
- 按钮 pending 态：本地 state，直到对应 SSE state 事件到达或 3s 超时解禁

**带参 recipe**：
- server：`just --list` 换用或补一次 `just --summary` + 逐 recipe `just --show <r>`（懒解析、进程内缓存）；`/__just/recipes` 返回 `{ name, params: string[] }`
- web：启动带参 recipe 时弹参数输入小面板（动态字段，placeholder = 参数名），确认后 `POST /__just/start { recipe, args: {k:v} }`
- runner：`spawn('just', [recipe, ...argPairs])`

**不做**：
- 不做日志持久化/下载（Low 批次再议）
- 不做 ANSI 全量语义解析（ansi-to-react 现状够用）
- 不动编码解码层（已由 just-log-encoding 落地）

**备选 B:虚拟滚动库**——被否：引入 react-virtuoso 增依赖，合批 + memo 后 1000 行上限内原生渲染足够。

## 接口 / 数据契约

- `GET /__just/recipes` → `[{ name: string, params: string[] }]`（原返回 string[] 处升级；客户端兼容两种形状过渡）
- `POST /__just/start` body 增可选 `args: Record<string, string>`；runner spawn argv 追加 `k=v`

## 实施步骤

1. TDD：锚定计算纯函数（距底判定/N 行计数）；runner 参数解析与 argv 拼装
2. LogViewer 合批 + memo + seq key；锚定 + 回底按钮
3. 搜索/级别过滤；启停 res.ok + pending 态 + toast
4. server recipes 参数清单接口 + 启动传参 UI
5. 回归 + playground 手验（`just lines`/`build`/`hello msg=x`）

## 性能优化点

合批后高频场景每 50ms 至多一次 setState；memo + seq key 使旧行零重渲；elapsed 局部化消除每秒全量重渲。

## 风险与 Trade-off

- 风险：`just --show` 逐 recipe 探测慢 → 懒解析（首展开该 recipe 时）+ 进程内缓存
- 风险：参数值含空格/特殊字符 → spawn 数组 argv 天然安全，不经 shell 拼接
- 开放问题：参数输入面板的交互形态（小 popover vs 内联行）实施时按最小惊讶定

## 测试策略

- **单元**：锚定判定/回底计数纯函数；runner 参数解析（`hello msg=` → params=['msg']）与 argv 拼装（含特殊字符）
- **组件**：合批（FakeES 连发 10 事件 → 1 次渲染追加）；级别过滤；搜索高亮；pending 态按钮；带参启动弹面板并携带 args
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 日志改造地图 | diagrams/log-ux-map.html | 锚定/合批/搜索/传参五项改造 |