# Tasks: 主题系统 v2

## Phase 0 架构完善

- [ ] 0.1 theme CSS 分文件：globals.css 只留 :root+[data-mode=dark]+.dot-grid+@import；pixel 两块抽 src/web/themes/pixel.css
- [ ] 0.2 字体令牌：--font-sans/--font-mono 定义 + tailwind fontFamily 挂变量
- [ ] 0.3 边框令牌：--border-width + tailwind borderWidth.DEFAULT 挂变量
- [ ] 0.4 themes.ts：id 放宽为 string；swatch 保持主题代表色（无 mode 概念）
- [ ] 0.5 StyleSelect：手绘 SVG→lucide Palette；current 改 React state（切换即时刷新选中态）
- [ ] 0.6 icon registry：src/web/lib/icons.ts 当前主题图标集；覆盖三处集中映射+EmptyState；内联装饰图标记边界不纳入

## Phase 1 Pixel 补强

- [ ] 1.1 pixel.css --border-width: 2px
- [ ] 1.2 装 @fontsource/vt323；pixel.css --font-mono 栈式回退（中文回落 sans）
- [ ] 1.3 装 pixelarticons；icons.ts pixel 映射覆盖 FileIcon+GROUP_ICON×2+rail 首页；缺口 fallback

## Phase 2新增主题（SOP 活验证）

- [ ] 2.1 src/web/themes/nord.css（调色板,保留圆角阴影）+ themes.ts 加条目——**git diff 零 tsx 铁证**

## Phase 3 文档与验收

- [ ] 3.1 README「添加主题 SOP」三步+约束清单
- [ ] 3.2 验收：Pixel 四件套（2px/vt323/像素图标三处/直角无阴影）；Nord 零 tsx；每主题×{dark,light} 全工作区无漏色；tsc/build/vitest 全绿；旧 pixel 用户无缝

## 边界（明确不做）

- 中文像素字体、内联装饰图标主题化、主题切换动画、StyleSelect hover 实时预览
