/**
 * view server 侧:definePlugin 接入(manifest 单源)。
 * 文件树路由 /__files 由 core/tree.ts 宿主服务提供(约定目录 ['openspec','docs'],非配置),此处仅注册 manifest。
 */
import { defineBuiltin } from '../builtin.js';
import { manifest } from './manifest.js';

export const apply = defineBuiltin({
  manifest,
  setup() { /* 路由由 core/tree.ts 承载 */ },
});
