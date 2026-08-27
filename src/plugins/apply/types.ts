/** apply 插件共享类型(server 路由与 Workspace/测试共用) */
export interface ChangeSummary {
  name: string;
  path: string;
  total: number;
  done: number;
  hasProposal: boolean;
  hasDesign: boolean;
  inWorktree: boolean;
}

export interface ChangeDetail extends ChangeSummary {
  proposal?: string;
  design?: string;
  tasks: string;
  dependsOn: string[];
  hasTestStrategy: boolean;
}
