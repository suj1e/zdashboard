# 设计:首屏优化

## 现有系统分析

- `src/web/lib/icons.tsx:6-7`：`import * as lucide from 'lucide-react'`、`import * as pixelReact from 'pixelarticons/react/index.js'`；`:170-186` 经 `ICON_MAP` 字符串动态索引组件——esbuild/rollup 无法静态分析 → 全量进包
- `index.html`：无内联主题脚本；`main.tsx:11-25` 在 bundle 执行时才写 dataset（含 `zdashboard-theme` → `zd-theme` legacy 迁移与 `zd-mode`）
- 产物实测：`index-*.js` 1,517,287 B；CodeViewer(1.78MB, KaTeX) 已是懒 chunk 不受影响

## 方案设计

### 方案 A:具名导入 + manualChunks + 内联主题脚本(选定)

1. **icons.tsx 改造**：
   - 保留 `ICON_MAP`（name→组件名字符串）结构不变，但顶部改为**按 ICON_MAP 收集到的组件名清单具名导入**（lucide 具名 import 一行一个；pixelarticons 经其包内深路径或同样具名导入）
   - 渲染索引从「字符串 → 组件查表」改为「字符串 → 直接引用的组件常量查表」（值即组件，非名字符串），动态索引消失
   - 三个 renderer（default/pixel/slate）shared 同一 import 池
   - 防缺漏：dev 期断言 `ICON_MAP` 每个值在 import 池中存在（缺失即 console.error）
2. **manualChunks**：`react`/`react-dom`/`router` 一块、`sonner`+`radix` 一块、其余默认；目标 eager 主包仅含业务代码 + 图标按需集
3. **FOUC 脚本**（index.html head，阻塞前执行）：
   ```html
   <script>
     try {
       var t=localStorage.getItem('zd-theme');var m=localStorage.getItem('zd-mode');
       var d=document.documentElement;
       if(m) d.dataset.mode=m; if(t) d.dataset.theme=t;
     }catch(e){}
   </script>
   ```
   main.tsx 现有迁移/校验逻辑保留（兜底非法值），内联脚本只负责「赶在首帧前」
4. **pixelarticons 深路径确认**：实施时核验包导出形态（`pixelarticons/react` 具名可用性）；不可用则该主题图标集整体懒加载（首次切 pixel 主题时 import()），default/slate 不背其体积

**不做**：
- 不动 KaTeX/highlight 等已懒加载的重 chunk
- 不做图标子集化/SVG sprite（收益递减，具名导入已解决主矛盾）
- 不改主题 token 结构

**备选 B:动态 import 图标模块**——被否：ICON_MAP 消费在渲染热路径，异步化引入闪烁与复杂度。

## 接口 / 数据契约

`useIcons()`/`useModeIcon()` API 不变；`ICON_MAP` 结构不变。

## 实施步骤

1. 脚本化从 ICON_MAP 提取组件名清单 → 生成具名 import 块（一次性脚本或手写，之后手工维护）
2. 渲染索引改造 + dev 缺漏断言
3. manualChunks 配置 + 构建体积对比记录
4. index.html 内联脚本 + 手验明暗冷启动
5. 三主题×明暗图标走查（🔧[人工]）

## 性能优化点

主包预期 1.45MB → <700KB（lucide 按需约 100-200KB、pixelarticons 按需更小或懒加载）；白屏期同比缩短。

## 风险与 Trade-off

- 风险：具名导入遗漏新图标 → dev 断言兜底；新增强制过 ICON_MAP + import 池两处
- 风险：pixelarticons 导出形态不明 → 实施时核验，不可具名则整体懒加载
- 开放问题：无

## 测试策略

- **单元**：ICON_MAP 渲染冒烟（每个 key 渲染非空）——防缺漏断言的测试化
- **组件**：主题切换后图标仍渲染；明暗冷启动 dataset 断言（内联脚本逻辑抽可测纯函数）
- **人工**：🔧[人工] 三主题×明暗走查截图对比；构建体积前后记录
- **回归**：`pnpm typecheck && pnpm test` 全绿（基线既有环境失败除外）

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 首屏体积与FOUC | diagrams/bundle-fouc.html | 主包 1.45MB→0.6MB + 深色首帧 |
### 覆盖率目标
- 主题兜底纯函数分支覆盖 ≥90%;ICON_MAP 冒烟 100% 键;体积与闪屏为构建/人工核验项(非覆盖率)。

### 测试图示
- 测试金字塔:diagrams/test-pyramid.html(测试金字塔(6/4/2))
- 场景覆盖图:diagrams/scenario-coverage.html(五场景覆盖图)
