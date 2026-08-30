/**
 * market server 侧:defineBuiltin 接入(参考 design 插件形态)。
 * T1 骨架:仅注册 manifest;代理与目录路由在 T2 接入(proxy.ts + catalog)。
 */
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

export const apply = defineBuiltin({
  manifest,
  setup() {},
});
