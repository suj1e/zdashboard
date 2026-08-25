import fs from 'node:fs';
import path from 'node:path';

export interface BatchChange {
  name: string;
  path: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'parked' | 'skipped';
  priority: number;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  dependencies: string[];
  estimatedDuration: number;
  batchIndex: number;
  checkpoint?: {
    currentTaskIndex: number;
    totalTasks: number;
    completedTasks: number;
    currentTask: string;
  };
  error?: string;
  retryCount: number;
  startedAt?: string;
  completedAt?: string;
}

export interface BatchLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  changeName?: string;
}

export interface BatchConflict {
  changeA: string;
  changeB: string;
  files: string[];
  resolution: 'serialize' | 'merge' | 'ignore';
}

export interface BatchState {
  version: string;
  status: 'idle' | 'analyzing' | 'pending-approval' | 'running' | 'paused' | 'completed' | 'failed';
  changes: BatchChange[];
  batches: {
    index: number;
    changeNames: string[];
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
  }[];
  currentBatchIndex: number;
  parallelism: number;
  logs: BatchLog[];
  conflicts: BatchConflict[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_STATE: Omit<BatchState, 'createdAt' | 'updatedAt'> = {
  version: '1',
  status: 'idle',
  changes: [],
  batches: [],
  currentBatchIndex: -1,
  parallelism: 2,
  logs: [],
  conflicts: [],
};

export class ApplyBatchStore {
  private root: string;
  private statePath: string;
  private state: BatchState;
  private listeners: Set<() => void> = new Set();

  constructor(root: string, onBroadcast?: () => void) {
    this.root = root;
    this.statePath = path.join(root, '.zapply', 'batch-state.json');
    this.state = this.load();
  }

  private load(): BatchState {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      }
    } catch { /* ignore */ }
    return { ...DEFAULT_STATE, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }

  private save(): void {
    this.state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    this.listeners.forEach(fn => fn());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  read(): BatchState {
    return this.state;
  }

  updateStatus(status: BatchState['status']) {
    this.state.status = status;
    this.save();
  }

  updateChanges(changes: BatchChange[]) {
    this.state.changes = changes;
    this.save();
  }

  updateBatches(batches: BatchState['batches']) {
    this.state.batches = batches;
    this.save();
  }

  updateParallelism(parallelism: number) {
    this.state.parallelism = Math.max(1, Math.min(8, parallelism));
    this.save();
  }

  addLog(log: BatchLog) {
    this.state.logs.push(log);
    // Keep only last 1000 logs
    if (this.state.logs.length > 1000) {
      this.state.logs = this.state.logs.slice(-1000);
    }
    this.save();
  }

  updateConflicts(conflicts: BatchConflict[]) {
    this.state.conflicts = conflicts;
    this.save();
  }

  updateChange(name: string, patch: Partial<BatchChange>) {
    const idx = this.state.changes.findIndex(c => c.name === name);
    if (idx !== -1) {
      this.state.changes[idx] = { ...this.state.changes[idx], ...patch };
      this.save();
    }
  }

  updateCheckpoint(name: string, checkpoint: BatchChange['checkpoint']) {
    const idx = this.state.changes.findIndex(c => c.name === name);
    if (idx !== -1) {
      this.state.changes[idx].checkpoint = checkpoint;
      this.save();
    }
  }

  reset() {
    this.state = { ...DEFAULT_STATE, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.save();
  }
}
