/**
 * just 侧栏:活跃任务列表(server /__just/tasks,subscribe plugin:just:state)。
 * 点活跃任务 → task(及 recipe)入 URL;LogViewer 主区按 URL 聚焦。
 */
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { useIcons, useModeIcon } from '../../web/lib/icons.js';
import { manifest } from './manifest.js';

type TaskStatus = 'running' | 'exited';
interface TaskInfo { recipe: string; state: TaskStatus; code: number | null; startedAt: number; signal?: string }

export default function Sidebar() {
  const route = useRoute();
  const current = route.params.get('task') ?? route.params.get('recipe');
  const { icon } = useIcons();
  const themed = useModeIcon(manifest.mode, 'h-4 w-4');
  const tasks = usePluginData<TaskInfo[]>('just:/__just/tasks', () =>
    fetch('/__just/tasks', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'plugin:just:state' });

  const running = (tasks.data ?? []).filter((t) => t.state === 'running');

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="px-2 py-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {themed}
        <span>活跃任务</span>
        {running.length > 0 && (
          <span className="ml-auto rounded-full bg-success/10 text-success px-1.5 font-mono">{running.length}</span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto py-1" data-testid="just-task-list">
        {running.map((t) => (
          <button
            key={t.recipe}
            onClick={() => route.navigate({ task: t.recipe, recipe: t.recipe })}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md ${current === t.recipe ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <span className="h-1.5 w-1.5 rounded-[var(--radius-full)] bg-success animate-pulse shrink-0" />
            <span className="font-mono truncate">{t.recipe}</span>
          </button>
        ))}
        {running.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-muted-foreground">暂无活跃任务</p>
        )}
      </div>
      <div className="px-2.5 py-2 text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border">
        {icon('terminal', 'h-3 w-3')}
        <span>日志见右侧主区</span>
      </div>
    </div>
  );
}
