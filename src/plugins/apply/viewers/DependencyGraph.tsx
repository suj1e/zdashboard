/**
 * 批量依赖图(只读):批次分组 + 状态筛选 + 选中 change(经 onSelectChange 入 URL sel)。
 * 自 apply-batch viewers 迁入裁剪(2026-08-28-apply-merge-progress):重试按钮随写路由一并删除。
 */
import { useState } from 'react';

interface Change {
  name: string;
  status: string;
  dependencies: string[];
  batchIndex: number;
}

interface Conflict {
  changeA: string;
  changeB: string;
  files: string[];
}

interface Props {
  graph: {
    changes: Change[];
    batches: { index: number; changeNames: string[]; status: string }[];
    conflicts: Conflict[];
  };
  selectedChange: string | null;
  onSelectChange: (name: string | null) => void;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
  parked: 'bg-warning/20 text-warning',
  skipped: 'bg-muted text-muted-foreground line-through',
};

export default function DependencyGraph({ graph, selectedChange, onSelectChange }: Props) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = graph.changes.filter(c => filter === 'all' || c.status === filter);

  const batchGroups = graph.batches.reduce<Record<number, Change[]>>((acc, batch) => {
    const changesInBatch = graph.changes.filter(c => c.batchIndex === batch.index);
    if (changesInBatch.length) acc[batch.index] = changesInBatch;
    return acc;
  }, {});

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-80 border-r border-border overflow-y-auto p-4">
        <div className="mb-4">
          <label className="text-sm font-medium">状态筛选</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">全部</option>
            <option value="pending">待执行</option>
            <option value="running">执行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="parked">已暂停</option>
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.name}
              onClick={() => onSelectChange(selectedChange === c.name ? null : c.name)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedChange === c.name ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{c.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[c.status] || STATUS_COLOR.pending}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                批次 {c.batchIndex} · 依赖 {c.dependencies.length} 个
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Graph Area */}
      <main className="flex-1 overflow-y-auto p-6">
        {graph.conflicts.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border border-warning bg-warning/10">
            <h3 className="font-medium text-warning mb-2">⚠️ 文件冲突检测</h3>
            <div className="space-y-2">
              {graph.conflicts.map((conflict, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{conflict.changeA}</span>
                  <span className="text-muted-foreground"> 与 </span>
                  <span className="font-medium">{conflict.changeB}</span>
                  <span className="text-muted-foreground"> 冲突于: </span>
                  <code className="text-xs bg-background/50 px-1 rounded">{conflict.files.join(', ')}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(batchGroups)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([batchIndex, changes]) => (
              <div key={batchIndex}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  批次 {batchIndex}
                  <span className="ml-2 text-xs">
                    ({changes.filter(c => c.status === 'completed').length}/{changes.length} 完成)
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {changes.map(c => (
                    <div
                      key={c.name}
                      onClick={() => onSelectChange(selectedChange === c.name ? null : c.name)}
                      className={`p-4 rounded-lg border transition-colors ${
                        selectedChange === c.name ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[c.status] || STATUS_COLOR.pending}`}>
                          {c.status}
                        </span>
                      </div>
                      {c.dependencies.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          依赖: {c.dependencies.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
