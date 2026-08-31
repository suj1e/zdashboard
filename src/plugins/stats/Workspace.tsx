/**
 * stats 工作区:PluginPage 模板(5 卡片 + Top10 + 探测区)。
 * 钻取经 router.navigate 做实(Worktree→view、未提交→view 高亮 dirty);探测区读 /__detect。
 */
import { useIcons, useModeIcon, type IconKey } from '../../web/lib/icons.js';
import { formatBytes } from '../../web/lib/utils.js';
import { ProgressBar } from '../../web/components/ProgressBar.js';
import { PluginPage, ErrorState, Skeleton } from '../../web/kit/index.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { fetchJson } from '../../web/lib/fetchJson.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';

interface ExtCount { ext: string; count: number }
interface StatsData {
  root: string;
  files: number;
  dirs: number;
  totalSize: number;
  byExt: ExtCount[];
  markdown: number;
  openspec: { active: number; archived: number };
  hasJust: boolean;
  worktrees: number;
  branch?: string;
  dirty?: number;
}

interface DetectData {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
}

export default function Workspace(_props: PluginWorkspaceProps) {
  const { icon } = useIcons();
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  const stats = usePluginData<StatsData>('stats:/__stats/data', () =>
    fetchJson<StatsData>('/__stats/data', { cache: 'no-store' }), { subscribe: 'files' });
  const detect = usePluginData<DetectData>('stats:/__detect', () =>
    fetchJson<DetectData>('/__detect', { cache: 'no-store' }));

  if (stats.error) {
    return (
      <div className="h-full flex flex-col">
        <ErrorState message={stats.error} onRetry={stats.reload} />
      </div>
    );
  }
  if (!stats.data) {
    return <div className="h-full p-6"><Skeleton rows={8} /></div>;
  }
  const data = stats.data;

  const max = Math.max(...data.byExt.map(e => e.count), 1);

  /** drill 非空 → 卡片可钻取:navigate 到 view 并携带 card 来源 */
  const cards: { label: string; value: string; iconName: IconKey | null; drill: string | null }[] = [
    { label: '文件', value: String(data.files), iconName: 'file-text', drill: null },
    { label: '目录', value: String(data.dirs), iconName: 'folder-tree', drill: null },
    { label: '总大小', value: formatBytes(data.totalSize), iconName: null, drill: null },
    { label: 'Worktree', value: String(data.worktrees), iconName: 'git-branch', drill: 'worktree' },
    { label: '未提交', value: String(data.dirty ?? 0), iconName: null, drill: 'dirty' },
  ];

  const drillTo = (card: string) => route.navigate({ p: 'view', card });

  return (
    <PluginPage manifest={manifest} icon={themed} breadcrumb={['插件', manifest.mode]}>
      <div className="mx-auto h-full max-w-6xl overflow-auto rounded-lg border bg-background p-6 shadow-sm">
        <p className="text-xs text-muted-foreground mb-5">后端 fs 扫描 + 前端渲染 · 改文件即时刷新 · 点击卡片跳转</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {cards.map(card => (
            <button
              key={card.label}
              type="button"
              onClick={() => card.drill && drillTo(card.drill)}
              disabled={!card.drill}
              title={card.drill ? `点击跳转至 ${card.label}` : undefined}
              className={`rounded-lg border bg-background p-4 text-left transition-colors ${card.drill ? 'hover:bg-muted/70 cursor-pointer' : 'cursor-default opacity-80'}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold">{card.value}</div>
                {card.iconName && icon(card.iconName, 'h-4 w-4 text-muted-foreground/50')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
            </button>
          ))}
        </div>

        <h2 className="text-xs font-medium text-muted-foreground mb-3">文件类型 Top 10</h2>
        <div className="space-y-2">
          {data.byExt.map(e => (
            <div key={e.ext} className="flex items-center gap-3 text-xs">
              <span className="w-16 font-mono text-foreground truncate">{e.ext}</span>
              <ProgressBar value={parseFloat((e.count / max * 100).toFixed(1))} className="flex-1 h-2" />
              <span className="w-8 text-right font-mono text-muted-foreground">{e.count}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs">
          {/* detect 失败与「justfile ✗」分开语义:探测失败 ≠ 项目无 justfile */}
          {detect.error ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-muted-foreground border-border">
              justfile 探测失败
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${detect.data?.hasJust ? 'text-success border-success/30 bg-success/10' : 'text-muted-foreground border-border'}`}>
              justfile {detect.data?.hasJust ? '✓' : '✗'}
            </span>
          )}
          {typeof data.dirty === 'number' && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${data.dirty ? 'text-warning border-warning/30 bg-warning/10' : 'text-success border-success/30 bg-success/10'}`}>
              {data.dirty ? `${data.dirty} 未提交` : 'clean'}
            </span>
          )}
          <span className="text-muted-foreground">root: {data.root}</span>
        </div>
      </div>
    </PluginPage>
  );
}
