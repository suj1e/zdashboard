/** market web 侧:defineWebPlugin(manifest 单源),SDK lazy 分包 */
import { lazy } from 'react';
import { defineWebPlugin } from '../../sdk/client.js';
import { manifest, params } from './manifest.js';

export default defineWebPlugin({
  manifest,
  params,
  workspace: lazy(() => import('./Workspace.js')),
});
