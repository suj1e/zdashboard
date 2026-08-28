/**
 * 批量 checkpoint 进度(只读):执行中变更的任务列表与当前任务高亮。
 * 自 apply-batch viewers 原样迁入(2026-08-28-apply-merge-progress),无写控件。
 */
interface Change {
  name: string;
  status: string;
  checkpoint?: {
    currentTaskIndex: number;
    totalTasks: number;
    completedTasks: number;
    currentTask: string;
  };
}

interface Props {
  state: { changes: Change[] };
  selectedChange: string | null;
  onSelectChange: (name: string | null) => void;
}

export default function CheckpointViewer({ state, selectedChange, onSelectChange }: Props) {
  const changesWithCheckpoint = state.changes.filter(c => c.checkpoint && c.status === 'running');

  return (
    <div className="flex h-full">
      {/* Change List */}
      <aside className="w-80 border-r border-border overflow-y-auto p-4">
        <h3 className="text-sm font-medium mb-3">执行中的变更</h3>
        <div className="space-y-2">
          {changesWithCheckpoint.length === 0 && (
            <p className="text-sm text-muted-foreground">暂无执行中的变更</p>
          )}
          {changesWithCheckpoint.map(c => (
            <div
              key={c.name}
              onClick={() => onSelectChange(selectedChange === c.name ? null : c.name)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedChange === c.name ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.checkpoint!.completedTasks}/{c.checkpoint!.totalTasks} 任务
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Checkpoint Detail */}
      <main className="flex-1 overflow-y-auto p-6">
        {selectedChange && changesWithCheckpoint.find(c => c.name === selectedChange) ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">{selectedChange}</h3>
            <div className="space-y-3">
              {Array.from({ length: changesWithCheckpoint.find(c => c.name === selectedChange)!.checkpoint!.totalTasks }).map((_, i) => {
                const change = changesWithCheckpoint.find(c => c.name === selectedChange)!;
                const isCompleted = i < change.checkpoint!.completedTasks;
                const isCurrent = i === change.checkpoint!.currentTaskIndex;

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      isCompleted
                        ? 'border-success/30 bg-success/5'
                        : isCurrent
                        ? 'border-info/30 bg-info/5'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCompleted
                            ? 'bg-success text-success-foreground'
                            : isCurrent
                            ? 'bg-info text-info-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? '✓' : isCurrent ? '↻' : i + 1}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                          {isCurrent ? change.checkpoint!.currentTask : `任务 #${i + 1}`}
                        </div>
                        {isCurrent && (
                          <div className="text-xs text-info mt-1">执行中...</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            选择一个变更查看任务进度
          </div>
        )}
      </main>
    </div>
  );
}
