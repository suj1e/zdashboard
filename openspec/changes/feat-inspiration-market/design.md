# 设计:灵感市场插件(feat-inspiration-market)

> 快车道增强:来源/形态/载体/深度均经澄清拍板;核心闭环 = 浏览开源资产 → 转提示词。
> 探针实证(2026-08-29):cdn.jsdelivr.net 可直取 simple-icons SVG 与 animate.css;data.jsdelivr.com 目录接口不稳定 → 用内置 slug 目录兜底。

## 现有系统分析

- 插件体系:SDK(definePlugin/defineWebPlugin + manifest.ts 单源)、kit 组件(PluginPage/Toolbar/EmptyState…)、`?p=<mode>&params` 路由、SSE/usePluginData 数据层——全部直接复用。
- 外部内容获取先例:无(view/design 全本地)。新增 server 代理是唯一新基建。
- CSS 动效播放:demo 元素 + 原生 class 切换,零依赖。

## 方案设计

### 插件骨架(mode: market)

```
src/plugins/market/
  manifest.ts        # mode/label「灵感市场」/icon ✨/order 40;params: tab/market,q,entry
  index.ts           # definePlugin:代理路由 + 目录路由
  web.tsx            # defineWebPlugin
  Workspace.tsx      # 三市场 Tab(Logo/动效/灵感),URL ?tab= 驱动
  PromptPanel.tsx    # 转提示词:模板填充 + 可编辑 textarea + 复制(toast)
  sources/
    logotypes.ts     # simple-icons slug 精选目录(v1 ~200 常用品牌,按类别分组)
    motions.ts       # animate.css/hover.css 精选目录(v1 69 项:name/class/desc/标签/源库)
    inspirations.ts  # 设计灵感内置目录(v1 ~40 条:name/desc/url/标签)
  test/
```

### server 侧(market/index.ts)

- `GET /__market/proxy?url=<allowlist 内的完整 URL>`:host 白名单 `cdn.jsdelivr.net`、`data.jsdelivr.com`;非白名单 403;上游超时 8s;内存缓存(条目 ≤200,TTL 10min);上游失败回 502,前端降级。
- `GET /__market/catalog/<market>`:返回内置目录 JSON(logotypes/motions/inspirations)。
- 复用 sdk route(自动 json)。

### 三市场视图

| Tab | 数据 | 浏览 | 详情 | 提示词模板 |
|---|---|---|---|---|
| Logo | slug 目录 → 逐项 `<img src=proxy(simple-icons/…svg)>`;前端搜索过滤 | 网格卡(图标+名称,懒加载) | 大图 + SVG 源码(CodeViewer)+ 风格特征注入(单色/几何/24×24 viewBox 等 simple-icons 事实) | 「为 <品牌/行业> 设计一个 Logo:单色几何风格、极简、24×24 网格、适配 favicon 与暗色模式;参考 <名称> 的造型语言(仅风格参考,不得复制商标)」 |
| 动效 | motions 目录 → 按需 `proxy(库 css)` 解析出类名 | 网格卡(每个 demo 方块实时播放该动效,hover 重播) | 动效源码(keyframes/类)+ 时序/缓动参数表 | 「实现一个 <名称> 动效:<描述>;参考实现:<CSS 源码>;要求可自定义时长/缓动,尊重 prefers-reduced-motion」 |
| 灵感 | inspirations 目录 | 网格卡(名称/一句话/标签,标签可过滤) | 描述 + 特征清单 + 「新窗口打开原站」 | 「设计一个类似 <名称>(<url>)的页面:特征 <标签/描述>;要求 <用户补充输入>」 |

- PromptPanel 统一组件:模板填充 → textarea 可编辑 → 复制按钮(clipboard + toast「已复制」);每次生成记录最近 5 条(localStorage)可回看。
- 搜索/标签过滤:前端内存过滤(目录量级 ≤ 200)。
- URL 契约:`?p=market&tab=logos|motions|inspirations&q=<搜索词>&entry=<详情项>`(entry 入 URL 可分享)。

### 错误/降级

- 代理 502/超时:详情区显示错误 + 重试;网格缩略图失败显示名称占位。
- 离线:目录(内置)仍可浏览,仅源码/图标加载失败——提示词模板不依赖在线内容的部分照常可用。

### 安全

- 代理仅 allowlist 双 host;无任意 URL 转发(SSRF 面 = 0)。
- 外部 SVG 以 `<img>` 渲染(非 innerHTML 注入),天然不执行脚本。
- 提示词不自动外发,仅本地剪贴板。

## 接口 / 数据契约

- `GET /__market/catalog/<market>` → `{ entries: [{ id, name, desc?, tags?, cls?(motions), slug?(logos), url?(inspirations), lib? }] }`
- `GET /__market/proxy?url=<encoded>` → 上游原文(text/svg/css);`X-Market-Cache: hit|miss` 头。
- URL:`?p=market&tab=&q=&entry=`。

## 实施步骤

1. 插件骨架 + 三目录数据文件(sources/*)。
2. server 代理(allowlist/超时/缓存)+ catalog 路由 + 单测(白名单 403/缓存头/超时降级)。
3. Logo Tab(slug 网格 + 搜索 + 详情 + SVG 源码)。
4. 动效 Tab(CSS 拉取解析 + demo 播放 + 源码)。
5. 灵感 Tab + PromptPanel(三模板 + 编辑 + 复制 + 最近记录)。
6. 回归 + 手工冒烟(三主题×明暗、断网降级、剪贴板权限拒绝降级)。

## 设计模式建议

- 目录与取数分离(catalog 静态内置 / content 经代理):目录演进不动代理,代理加固不动目录。
- PromptPanel 模板策略:每市场一个 template 函数,新增市场 = 新模板 + 新目录,骨架零改动(开闭)。

## 性能优化点

- 代理内存缓存(同 URL 二次命中零上游请求);网格懒加载(img loading="lazy");目录量级内存过滤无压力。

## 实施期修订记录（OpenProps descope）

初版动效来源含 OpenProps。实施复核：OpenProps 为 CSS 变量/keyframes 库、无工具类，不适配「类名 → demo 播放」的 cls 模型（需独立成组与解析器）。裁决：v1 收敛为 animate.css + hover.css 两库（69 条精选覆盖主流动效），OpenProps 留待后续以独立分组形态另立。

## 风险与 Trade-off

- **第三方源不可控**(simple-icons 目录接口已现不稳):slug 目录内置兜底,源接口只作增强。
- **商标合规**:Logo 市场仅浏览/参考,提示词模板显式写「风格参考,不得复制商标」;不提供品牌资产下载打包。
- **剪辑版权**:animate.css 等均 MIT,提示词内嵌源码合规。
- iframe 不可用第三方站点:灵感市场不做内嵌(诚实降级为新窗口)。
- data.jsdelivr 目录接口不稳:v1 用内置 slug 目录;后续可加远程目录热更新(结构已预留)。

## 测试策略

1. **单元(vitest)**:
   - 代理:白名单外 403、白名单内透传 Content-Type、上游 500→502、缓存命中(X-Market-Cache: hit)、超时降级(fake timers)。
   - catalog:三市场目录返回、条目形状(每市场关键字段)、未知 market 404。
   - 提示词模板:三市场各一快照/断言(含用户补充段、CSS 源码内嵌、品牌名插值);最近记录环形(>5 截断)。
2. **组件**:
   - Workspace 三 Tab 切换(URL tab 参数读写);Logo 搜索过滤;动效卡 hover 重播(class 切换);灵感标签过滤;PromptPanel 编辑后复制内容 = textarea 值(clipboard mock)+ toast。
   - 降级:proxy 502 时详情错误态 + 网格占位;空目录/无搜索结果 EmptyState。
3. **回归**:基线全量 + typecheck + build;`?p=market` 深链接、三主题×明暗走查。
4. **手工**:真实网络下三市场端到端(搜 brand → 详情 → 转提示词 → 粘贴到 zdesign 对话可用);断网降级;剪贴板权限拒绝时 fallback(选中 textarea 提示手动复制)。

## 上线与人工动作

- 无(数据源为公网 CDN,无凭证;首次使用需本机可访问 jsdelivr)。

## 图示索引

| 图 | 相对路径 | 说明 |
|---|---|---|
| 市场数据流 | diagrams/market-dataflow.html | 三市场 → 目录/代理 → 视图 → 提示词闭环 |

![市场数据流](diagrams/market-dataflow.html)
