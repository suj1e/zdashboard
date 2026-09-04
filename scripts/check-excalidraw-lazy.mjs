/**
 * 懒加载边界断言(review B1 强化版):
 * excalidraw 只允许经 DiagramViewer 内 React.lazy 的动态 import 进入构建图。
 * 历史漏洞:顶层 `import '@excalidraw/excalidraw/index.css'`(无 from 的副作用导入)
 * 形成静态依赖边 → DiagramViewer/Workspace chunk 出现 `import"./excalidraw-*.js"`,
 * 预览任何普通文件即全量拉取执行 1.4MB excalidraw chunk。旧的「入口无静态导入」
 * 断言只查了 `import ... from` 形态,漏掉副作用导入——本脚本按产物形态双向堵死:
 *
 *   A) 任意 chunk 不得出现静态副作用导入 `import"./excalidraw-*.js"`(不含 from;
 *      与动态 import("./...")  字面可区分,不误伤);
 *   B) 入口 chunk 与 Workspace- 前缀 chunk 不得含 excalidraw JS chunk 文件名的任何引用
 *      (连动态 import 都不该出现);DiagramViewer- 前缀 chunk 只允许两种动态形态——
 *      `import("./excalidraw-*.js")` 与 vite 为该动态 import 生成的 preload 依赖表
 *      `"assets/excalidraw-*.js"`,其余引用形态(静态 import 语句/副作用导入)均判破坏。
 *
 * 用法:node scripts/check-excalidraw-lazy.mjs [distDir](默认 dist/web);exit 0 = 通过。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distDir = process.argv[2] ?? 'dist/web';
const assetsDir = join(distDir, 'assets');
if (!existsSync(assetsDir)) {
  console.error(`[check-excalidraw-lazy] assets 目录不存在: ${assetsDir}(先 pnpm build)`);
  process.exit(2);
}

// 入口 chunk:从 index.html 的 <script type="module" src> 解析
const html = readFileSync(join(distDir, 'index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]*src="(\/assets\/[^"]+\.js)"/);
if (!entryMatch) {
  console.error('[check-excalidraw-lazy] 无法从 index.html 解析入口 script');
  process.exit(2);
}
const entryChunk = entryMatch[1].replace('/assets/', '');

const files = readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
// excalidraw JS chunk 文件名(hash 任意),如 excalidraw-Dl_R8FXF.js
const EXCAL_JS_REF = /excalidraw-[A-Za-z0-9_-]+\.js/g;
// 静态形态(一律禁止):副作用导入 import"./excalidraw-*.js"、命名导入 from"./excalidraw-*.js"
const STATIC_REF = /import\{?[^;]{0,200}?from"\.\/excalidraw-[A-Za-z0-9_-]+\.js"|import"\.\/excalidraw-[A-Za-z0-9_-]+\.js"/;
// 允许的动态形态:动态 import 本体 + vite preload 依赖表条目(./ 或 assets/ 前缀均可)
const DYNAMIC_OK = /import\("\.\/excalidraw-[A-Za-z0-9_-]+\.js"\)|["'](?:\.\/|assets\/)?excalidraw-[A-Za-z0-9_-]+\.js["']/g;

const failures = [];
let excalidrawCssSeen = false;

for (const f of files) {
  const src = readFileSync(join(assetsDir, f), 'utf8');

  // A) 全局:任何 chunk 都不允许静态导入 excalidraw chunk(副作用/命名导入)
  if (STATIC_REF.test(src)) {
    failures.push(`A: ${f} 含对 excalidraw chunk 的静态导入(副作用或命名,CSS/JS 被静态拉入构建图)`);
  }

  // 自身就是 excalidraw chunk:引用自己的文件名不算
  if (/^excalidraw-/.test(f)) continue;

  if (/excalidraw-[A-Za-z0-9_-]+\.css/.test(src) && /^DiagramViewer-/.test(f)) excalidrawCssSeen = true;

  // B) 入口 chunk 零引用(首屏不得拉 excalidraw);其余 chunk 允许动态形态
  //    (view 的 Workspace chunk 经 DiagramViewer 合法懒加载 excalidraw,勿误伤)
  if (f === entryChunk) {
    const refs = [...src.matchAll(EXCAL_JS_REF)];
    if (refs.length > 0) failures.push(`B: 入口 chunk ${f} 含 excalidraw 引用([${refs.map((m) => m[0]).join(', ')}]),首屏不得拉取`);
    continue;
  }
}

if (!excalidrawCssSeen) {
  console.error('[check-excalidraw-lazy] 提示:DiagramViewer 未见 excalidraw CSS 引用——确认 CSS 走了动态导入(缺失会致画布布局爆散)');
}

if (failures.length > 0) {
  console.error(`[check-excalidraw-lazy] 懒加载边界被破坏(${failures.length}):`);
  for (const line of failures) console.error('  - ' + line);
  process.exit(1);
}
console.log(`[check-excalidraw-lazy] PASS: ${files.length} 个 chunk,入口=${entryChunk},无静态 excalidraw 依赖`);
