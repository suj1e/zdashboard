/**
 * just 工作区:活跃任务侧栏 + LogViewer 主区(模板化)。
 * 选中任务由 URL 驱动(task 优先,退回 recipe);recipes 数据走 usePluginData。
 */
import { LogViewer } from '../../web/components/LogViewer.js';
import { PluginPage } from '../../web/kit/index.js';
import { useModeIcon } from '../../web/lib/icons.js';
import { useRoute } from '../../web/router.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';

export default function Workspace({ params }: PluginWorkspaceProps) {
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  const selected = params.get('task') ?? params.get('recipe');

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={['插件', manifest.mode, ...(selected ? [selected] : [])]}
    >
      <div className="mx-auto h-full max-w-6xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <LogViewer
          selected={selected}
          onSelect={(recipe) => route.navigate(recipe ? { recipe, task: null } : { recipe: null, task: null })}
        />
      </div>
    </PluginPage>
  );
}
