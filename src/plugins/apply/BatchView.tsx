/**
 * 批量驾驶舱视图(只读):数据源 .zdev/apply/runs/<runId>/state.json(经 /__apply/batch)。
 * Task 4 起步:快照读取 + 只读容器;graph/checkpoint/日志尾/plan 只读展示由 BatchView 完整版承接。
 * 刷新订阅全局 files 频道(skill 外部写文件 → fs.watch → SSE files → 失效重取)。
 */
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useIcons } from '../../web/lib/icons.js';
import { EmptyState } from '../../web/kit/index.js';
import type { BatchSnapshot } from './batch.js';

export default function BatchView() {
  const { icon } = useIcons();
  const snap = usePluginData<BatchSnapshot>('apply:/__apply/batch', () =>
    fetch('/__apply/batch', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'files' });

  return (
    <div data-testid="batch-view" className="h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      {snap.data === null && !snap.error ? (
        <div className="flex items-center justify-center h-full">加载中...</div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon={icon('blocks', 'h-6 w-6')}
            title="暂无批量执行数据"
            hint="在 zapply batch 中启动批量执行后,状态会出现在这里"
          />
        </div>
      )}
    </div>
  );
}
