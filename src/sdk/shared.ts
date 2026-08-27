/**
 * SDK 共享类型(client/server 双端可 import 的纯类型模块,无运行时依赖)。
 */

/** 插件声明的单个 URL 参数契约 */
export interface ParamField {
  /** URL 参数名(如 ?p=view&file=... 中的 file) */
  name: string;
  label?: string;
  type?: 'string' | 'number' | 'boolean';
  /** 缺省值;router 层不填默认,仅作文档与 UI 提示 */
  default?: string | number | boolean;
  description?: string;
}

/** 本插件消费的 URL 参数声明 */
export type ParamSchema = readonly ParamField[];
