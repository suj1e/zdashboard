/**
 * 动效库 CSS 零依赖解析:类名/类规则/keyframes/时序参数提取(纯函数,无框架依赖)。
 * 输入为经 /__market/proxy 拉取的 minified 库 css(animate.css@4 / hover.css@2)。
 * 用途:详情源码查看、提示词 CSS 内嵌、reduced-motion 覆盖规则甄别。
 */

/** 类名形态:字母/下划线开头,含数字连字符下划线(animate__bounce、hvr-grow-rotate) */
const CLASS_NAME_RE = /\.([A-Za-z_][\w-]*)/g;
/** 时长值:1s / .3s / 150ms */
const DURATION_RE = /^\d*\.?\d+(ms|s)$/;
/** 简写内迭代:infinite 或正整数 */
const ITERATION_RE = /^(infinite|\d+)$/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 提取 CSS 中出现的类名(去重,忽略伪类后缀;数字开头的 .3s 等数值天然不匹配) */
export function parseClassNames(css: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(CLASS_NAME_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.add(m[1]);
  return [...out];
}

/** 提取某类的规则文本;animate.css 的 reduced-motion !important 覆盖被跳过(取主规则) */
export function extractClassRule(css: string, cls: string): string | null {
  const re = new RegExp(`[^{}]*\\.${escapeRe(cls)}[^{]*\\{[^}]*\\}`, 'g');
  let fallback: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const rule = m[0].trim();
    if (!rule.includes('!important')) return rule;
    fallback ??= rule;
  }
  return fallback;
}

/** 括号配平提取 @keyframes(嵌套花括号安全);不存在 → null。
 *  词边界匹配 `@keyframes\s+<name>\s*{`,防 bounce 命中前置的 bounceIn。 */
export function extractKeyframes(css: string, name: string): string | null {
  const m = new RegExp(`@keyframes\\s+${escapeRe(name)}\\s*\\{`).exec(css);
  if (!m) return null;
  const idx = m.index;
  const open = css.indexOf('{', idx);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(idx, i + 1);
    }
  }
  return null;
}

export interface MotionTiming {
  duration?: string;
  easing?: string;
  iteration?: string;
}

/** 从规则文本解析时序/缓动参数(animation 简写优先,transition-duration 回退) */
export function extractTiming(rule: string): MotionTiming {
  const out: MotionTiming = {};
  const anim = rule.match(/animation(?:-name)?:\s*([^;}]+)/);
  if (anim && !anim[0].startsWith('animation-name')) {
    const parts = anim[1].trim().split(/\s+/);
    out.duration = parts.find((p) => DURATION_RE.test(p));
    const iter = parts.find((p) => ITERATION_RE.test(p));
    if (iter) out.iteration = iter;
  }
  if (!out.duration) {
    out.duration = rule.match(/animation-duration:\s*([^;}]+)/)?.[1].trim()
      ?? rule.match(/transition-duration:\s*([^;}]+)/)?.[1].trim();
  }
  if (!out.iteration) out.iteration = rule.match(/animation-iteration-count:\s*([^;}]+)/)?.[1].trim();
  out.easing = rule.match(/(?:animation-timing-function|transition-timing-function):\s*([^;}]+)/)?.[1].trim();
  // 清掉 undefined 键,便于断言 toMatchObject
  for (const k of Object.keys(out) as Array<keyof MotionTiming>) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

/** 组合「类规则 + 引用的 keyframes」为可复用源码(提示词内嵌同源) */
export function motionSourceOf(css: string, cls: string): string {
  const rule = extractClassRule(css, cls);
  if (!rule) return '';
  const lines = [rule];
  const anim = rule.match(/animation(?:-name)?:\s*([^;!}]+)/);
  if (anim) {
    const kfName = anim[1].trim().split(/\s+/)[0];
    const kf = extractKeyframes(css, kfName);
    if (kf) lines.push(kf);
  }
  return lines.join('\n');
}
