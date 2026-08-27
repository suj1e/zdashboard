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

// === 前端类型 ===
export type CurrentView =
  | { kind: 'file'; path: string }
  | { kind: 'log' }
  | { kind: 'plugin'; mode: string; label: string; icon: string }
  | null;
