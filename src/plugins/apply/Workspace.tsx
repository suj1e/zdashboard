/**
 * apply 工作区:Tab 壳(单 change｜批量驾驶舱),URL param view(single/batch,缺省 single)读写。
 * 子视图懒加载拆包(SDK lazy 分包惯例);PluginPage 由壳持有,页面状态经 onStatus 上报。
 * 批量视图只读(数据由 zapply skill 写入);旧 apply-batch 插件已并入(2026-08-28-apply-merge-progress)。
 */
import { lazy, Suspense, useCallback, useState } from 'react';
import { PluginPage, Skeleton } from '../../web/kit/index.js';
import { useRoute } from '../../web/router.js';
import { useModeIcon } from '../../web/lib/icons.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';
import type { PageStatus } from './SingleChangeView.js';

const SingleChangeView = lazy(() => import('./SingleChangeView.js'));
const BatchView = lazy(() => import('./BatchView.js'));

const VIEWS = ['single', 'batch'] as const;
type ViewKey = (typeof VIEWS)[number];

const VIEW_LABEL: Record<ViewKey, string> = { single: '单 change', batch: '批量驾驶舱' };

function asView(v: string | null): ViewKey {
  return (VIEWS as readonly string[]).includes(v ?? '') ? (v as ViewKey) : 'single';
}

export default function Workspace(_props: PluginWorkspaceProps) {
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  const view = asView(route.params.get('view'));
  // 基线行为(迁移保真):单 change 视图选中 change 时 breadcrumb 附加 change 名(三段)
  const change = route.params.get('change');
  const breadcrumb = ['插件', manifest.mode, ...(view === 'single' && change ? [change] : [])];
  const [status, setStatus] = useState<PageStatus>(undefined);
  const handleStatus = useCallback((s: PageStatus) => setStatus(s), []);

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={breadcrumb}
      status={status}
    >
      <div className="h-full flex flex-col gap-3">
        <div className="flex-none flex items-center gap-2">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => route.navigate({ view: v })}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === v ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0">
          <Suspense fallback={<Skeleton rows={6} className="mx-auto max-w-6xl" />}>
            {view === 'single' ? (
              <SingleChangeView onStatus={handleStatus} />
            ) : (
              <BatchView onStatus={handleStatus} />
            )}
          </Suspense>
        </div>
      </div>
    </PluginPage>
  );
}
