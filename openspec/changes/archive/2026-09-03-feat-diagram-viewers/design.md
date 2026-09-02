# 设计:.excalidraw/.drawio 预览(feat-diagram-viewers)

## 现有系统分析

- view:`Workspace.tsx viewerFor(path)` 按扩展名返回 viewer 组件;`.excalidraw`/`.drawio` 落 UnsupportedViewer。
- design:`design-assets.ts categorize(rel, ext)` 返回 null(不入扫描);viewers/index.ts 按 AssetType → 组件映射;Sidebar GROUPS 硬编码九类。
- 预览器获取内容的方式:统一 `fetch('/__file-content/' + path)`(design 走代理 resolve,同构)。

## 方案设计

### 共享 `src/web/viewers/DiagramViewer.tsx`

```tsx
export function DiagramViewer({ path, resolve }: { path: string; resolve?: (p: string) => string })
```
- 拉取文件内容(fetch + resolve 代理,同 MdViewer 模式);按扩展名分派:
  - `.excalidraw`:JSON.parse → 动态 `import('@excalidraw/excalidraw')`(React.lazy 等效)→ `<Excalidraw initialData={scene} viewModeEnabled renderConfig={{}} />` 只读画布;JSON 损坏 → 错误态。
  - `.drawio`:XML 文本 → encodeURIComponent → `<iframe src={'https://viewer.diagrams.net/?#R' + enc}>`(官方 viewer hash 契约,只读);加载失败/超时提供「在新窗口打开 viewer」链接降级。
- 依赖:`@excalidraw/excalidraw`(唯一新增,React 官方包)。**必须懒加载**:`DiagramViewer` 内部用 `React.lazy(() => import('@excalidraw/excalidraw'))` + Suspense,保证主包与 view/design 常规 chunk 不含该库。
- 样式:容器 h-full;excalidraw 容器给固定高度(读父级 flex 布局);iframe 无边框。

### view 接入
`viewerFor` 增:`if (['.excalidraw', '.drawio'].includes(ext)) return DiagramViewer;`

### design 接入
- `design-assets.ts`:`AssetType` 增 `'diagram'`;`categorize` 增 `if (['.excalidraw', '.drawio'].includes(ext)) return 'diagram';`(置于 CODE 判断之前)。
- `viewers/index.ts`:`ASSET_VIEWER_TYPES` 增 `'diagram'`;VIEWERS 增 `diagram: DiagramViewer`(从 `../../../web/viewers/DiagramViewer.js` import,与既有 MdViewer 等 web 共享件同模式)。
- `design/Sidebar.tsx` GROUPS 增 `图表`(icon 用 useIcons 的 'pen-tool' 或同类;标签过滤沿用)。
- 契约表测试(`manifests.test.ts` 的 ASSET_VIEWER_TYPES/GROUPS 断言)同步。

### 依赖与体积
- `@excalidraw/excalidraw` 固定版本(×.y.z exact)。懒加载边界:`React.lazy` 的 import 必须只出现在 DiagramViewer 模块内,由测试断言(检查 dist chunk 含独立 excalidraw 文件,或 eslint 级约定——采用 build 产物断言:dist/web/assets 中存在含 `excalidraw` 名字的独立 chunk)。

## 接口 / 数据契约

- AssetType 联合 +1 `'diagram'`(design 内部契约,契约表测试同步)。
- URL 不变(`?p=view&file=`、`?p=design&type=diagram&asset=` 天然可用)。
- 新 npm 依赖 1 个:`@excalidraw/excalidraw`(框架级,已拍板)。

## 实施步骤

1. DiagramViewer(excalidraw lazy + drawio iframe + 错误/降级态)+ 单测(mock 模块:excalidraw 懒加载被调、drawio iframe src 编码正确、损坏 JSON 错误态)。
2. view viewerFor 接入 + 路由测试。
3. design:categorize/AssetType/viewers/Sidebar/契约表 + 单测(categorize 两扩展、selectViewer('diagram'))。
4. 依赖安装(exact)+ build 产物断言(excalidraw 独立 chunk)+ 回归全绿 + 手工冒烟(真实 .excalidraw/.drawio 文件各一,三主题)。

## 风险与 Trade-off

- @excalidraw/excalidraw API 迭代快:exact 锁定,升级随 change。
- viewer.diagrams.net 为外部服务(在线依赖):失败降级链接 + 错误态;内网/离线场景用户可用 CodeViewer 看源码(右上仍有既有能力)。需在错误态明示。
- 首次预览 excalidraw chunk 下载 ~1MB:仅影响该类文件首次预览,可接受。
- drawio hash 长度:超大 XML(>2MB)可能超 URL 限制 → 错误态提示「文件过大」。

## 测试策略

1. **单元/组件**:
   - DiagramViewer:excalidraw 路径 → lazy Excalidraw 收到 initialData(JSON fixture);drawio 路径 → iframe src 含 `#R` + encodeURIComponent(xml);损坏 JSON → 错误态文案;resolve 代理路径生效(design 场景)。
   - view viewerFor:两扩展 → DiagramViewer。
   - design:categorize('.excalidraw'/'.drawio')→ 'diagram';selectViewer('diagram')→ DiagramViewer;Sidebar 渲染「图表」分组。
2. **构建断言**:build 后 dist/web/assets 存在独立 excalidraw chunk(grep 文件名)。
3. **手工冒烟**:playground 放一个真实 .excalidraw 与 .drawio;view/design 双入口预览;三主题;断网时 drawio 降级链接。
4. **回归**:基线 38 文件 281/281 + typecheck + build。

## 上线与人工动作

- 无。
