// === 服务端类型 ===
export interface DetectResult {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
  hasBugs: boolean;
}

export interface TreeNode {
  name: string;
  kind: 'dir' | 'file';
  path?: string;
  children?: TreeNode[];
  defaultCollapsed?: boolean;
}

export interface ZenBug {
  id: number;
  title: string;
  severity: number | string;
  pri: number | string;
  status: string;
  assignedTo: string;
  openedBy?: string;
  mine: boolean;
}

export type BugsResult =
  | { ok: true; url: string; total: number; bugs: ZenBug[] }
  | { ok: false; error: string };

// === 前端类型 ===
export type CurrentView =
  | { kind: 'file'; path: string }
  | { kind: 'log' }
  | { kind: 'plugin'; mode: string; label: string; icon: string }
  | null;
