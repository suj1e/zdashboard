import { useState } from 'react';

interface Change {
  name: string;
  status: string;
  priority: number;
  risk: string;
  estimatedDuration: number;
}

interface Props {
  state: {
    changes: Change[];
    parallelism: number;
    status: string;
  };
  onApprove: (parallelism: number, skipChanges: string[]) => void;
}

export default function ApprovalPanel({ state, onApprove }: Props) {
  const [parallelism, setParallelism] = useState(state.parallelism);
  const [skipped, setSkipped] = useState<string[]>([]);

  const toggleSkip = (name: string) => {
    setSkipped(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]));
  };

  const handleApprove = () => {
    onApprove(parallelism, skipped);
  };

  const pending = state.changes.filter(c => c.status === 'pending' || c.status === 'parked');
  const totalEstimated = pending.reduce((sum, c) => sum + (c.estimatedDuration || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">📋 执行计划确认</h2>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl font-bold">{state.changes.length}</div>
          <div className="text-sm text-muted-foreground">总变更数</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl font-bold">{pending.filter(c => c.status === 'pending').length}</div>
          <div className="text-sm text-muted-foreground">待执行</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl font-bold">{pending.filter(c => c.risk === 'high').length}</div>
          <div className="text-sm text-muted-foreground">高风险项</div>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="text-2xl font-bold">~{Math.ceil(totalEstimated / 60)}h</div>
          <div className="text-sm text-muted-foreground">预估总时长</div>
        </div>
      </div>

      {/* Parallelism Control */}
      <div className="mb-6 p-4 rounded-lg border border-border bg-card">
        <label className="block text-sm font-medium mb-2">并行度</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="8"
            value={parallelism}
            onChange={e => setParallelism(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-lg font-mono font-bold w-12 text-center">{parallelism}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          建议并行度 2-4。过高可能导致工作树冲突或资源竞争。
        </p>
      </div>

      {/* Change List */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">变更列表</h3>
        <div className="space-y-2">
          {pending.map(c => (
            <div
              key={c.name}
              className={`p-4 rounded-lg border ${
                c.status === 'parked' ? 'border-warning bg-warning/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={skipped.includes(c.name)}
                    onChange={() => toggleSkip(c.name)}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      优先级: {c.priority} · 风险: {c.risk} · 预估: {c.estimatedDuration} 分钟
                    </div>
                  </div>
                </div>
                {c.status === 'parked' && (
                  <span className="text-xs px-2 py-1 rounded bg-warning/20 text-warning">高风险</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          已跳过 {skipped.length} 个变更，预计执行 {pending.filter(c => !skipped.includes(c.name)).length} 个
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(parallelism, skipped)}
            className="px-6 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}
