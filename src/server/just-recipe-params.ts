/**
 * just recipe 参数纯函数:签名解析(just --show 首行)与 spawn argv 拼装。
 *
 * 解析器为字符级扫描(非空白切分):默认值可含空格(`a="x y"`),引号内内容不参与结构解析。
 * argv 拼装契约:数组原样传值,调用方 spawn 不得开 shell——值含空格/引号/& 时保持单元素,
 * 不经 shell 拼接即天然免疫注入与串位。
 */

export interface RecipeSignature { name: string; params: string[] }

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_-]*/;

/** 解析 recipe 签名行(`hello msg="world":`);无冒号收尾等非法输入 → null */
export function parseRecipeSignature(line: string): RecipeSignature | null {
  let s = line.trim();
  if (s.startsWith('@')) s = s.slice(1).trimStart(); // private recipe 前缀
  const nameMatch = NAME_RE.exec(s);
  if (!nameMatch) return null;
  const name = nameMatch[0];
  const params: string[] = [];
  let i = name.length;
  while (true) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) return null; // 没等到收尾冒号
    if (s[i] === ':') {
      const rest = s.slice(i + 1).trim();
      if (rest === '' || rest.startsWith('#')) return { name, params };
      return null;
    }
    // 参数 token:可选 +/$ 前缀 + 参数名 + 可选 =默认值(引号内可有空格)
    let j = i;
    if (s[j] === '+' || s[j] === '$') j++;
    const pm = NAME_RE.exec(s.slice(j));
    if (!pm) return null;
    j += pm[0].length;
    if (s[j] === '=') {
      j++;
      if (s[j] === '"' || s[j] === "'") {
        const quote = s[j];
        j++;
        while (j < s.length && s[j] !== quote) j++;
        if (j >= s.length) return null; // 引号未闭合
        j++;
      } else {
        while (j < s.length && !/\s/.test(s[j]) && s[j] !== ':') j++;
      }
    }
    params.push(pm[0]);
    i = j;
  }
}

/** spawn argv:[recipe, ...k=v];args 为空/undefined 时不追加,与无参调用同形 */
export function buildJustArgv(recipe: string, args?: Record<string, string>): string[] {
  if (!args) return [recipe];
  return [recipe, ...Object.entries(args).map(([k, v]) => `${k}=${v}`)];
}

/** start args 白名单化:仅保留 string 值;剔除后为空或输入非对象 → undefined(请求体不携带 args) */
export function pickStringArgs(args: unknown): Record<string, string> | undefined {
  if (typeof args !== 'object' || args === null) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
