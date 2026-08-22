import fs from 'node:fs';
import path from 'node:path';

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

function countTasks(md: string): { total: number; done: number } {
  const all = (md.match(/^\s*-\s*\[[ xX]\]\s*/gm) || []).length;
  const done = (md.match(/^\s*-\s*\[[xX]\]\s*/gm) || []).length;
  return { total: all, done };
}

function readText(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function worktreeDir(root: string, name: string): string {
  return path.join(root, '.zworktree', name);
}

function changeDir(root: string, name: string): string {
  return path.join(root, 'openspec', 'changes', name);
}

function resolveFile(root: string, wt: string, rel: string): { text: string; inWorktree: boolean } {
  // 优先 worktree 内，主目录兜底
  const wtPath = path.join(wt, 'openspec', 'changes', path.basename(wt), rel);
  const mainPath = path.join(changeDir(root, path.basename(wt)), rel);
  const wtExists = fs.existsSync(wtPath);
  const text = readText(wtExists ? wtPath : mainPath);
  return { text, inWorktree: wtExists };
}

function parseDependsOn(proposal: string): string[] {
  const deps: string[] = [];
  // 提取 "## 依赖" 节：紧跟该标题的列表行
  const m = proposal.match(/^##\s+依赖\s*\n([\s\S]*?)(?:\n##\s+|\n---\s*\n|$)/i);
  if (!m) return deps;
  for (const line of m[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('-')) continue;
    const name = trimmed.slice(1).trim();
    if (name) deps.push(name);
  }
  return deps;
}

export function scanApplyChanges(root: string): ChangeSummary[] {
  const changesDir = path.join(root, 'openspec', 'changes');
  if (!fs.existsSync(changesDir)) return [];
  const out: ChangeSummary[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name === 'archive') continue;
    const wt = worktreeDir(root, ent.name);
    const tasks = readText(path.join(wt, 'openspec', 'changes', ent.name, 'tasks.md'));
    if (!tasks) {
      const fallback = readText(path.join(changesDir, ent.name, 'tasks.md'));
      if (fallback) {
        const { total, done } = countTasks(fallback);
        out.push({
          name: ent.name,
          path: `openspec/changes/${ent.name}`,
          total,
          done,
          hasProposal: fs.existsSync(path.join(changesDir, ent.name, 'proposal.md')),
          hasDesign: fs.existsSync(path.join(changesDir, ent.name, 'design.md')),
          inWorktree: false,
        });
      }
    } else {
      const { total, done } = countTasks(tasks);
      out.push({
        name: ent.name,
        path: `openspec/changes/${ent.name}`,
        total,
        done,
        hasProposal: fs.existsSync(path.join(wt, 'openspec', 'changes', ent.name, 'proposal.md')),
        hasDesign: fs.existsSync(path.join(wt, 'openspec', 'changes', ent.name, 'design.md')),
        inWorktree: true,
      });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function readApplyChange(root: string, name: string): ChangeDetail {
  const wt = worktreeDir(root, name);
  const mainChangeDir = changeDir(root, name);

  // 优先 worktree 内；回退主目录
  const proposalFrom = fs.existsSync(path.join(wt, 'openspec', 'changes', name, 'proposal.md'))
    ? path.join(wt, 'openspec', 'changes', name, 'proposal.md')
    : path.join(mainChangeDir, 'proposal.md');
  const designFrom = fs.existsSync(path.join(wt, 'openspec', 'changes', name, 'design.md'))
    ? path.join(wt, 'openspec', 'changes', name, 'design.md')
    : path.join(mainChangeDir, 'design.md');
  const tasksFrom = fs.existsSync(path.join(wt, 'openspec', 'changes', name, 'tasks.md'))
    ? path.join(wt, 'openspec', 'changes', name, 'tasks.md')
    : path.join(mainChangeDir, 'tasks.md');

  const proposal = readText(proposalFrom);
  const design = readText(designFrom);
  const tasks = readText(tasksFrom);
  const { total, done } = countTasks(tasks);
  const inWorktree = fs.existsSync(path.join(wt, 'openspec', 'changes', name));
  const dependsOn = parseDependsOn(proposal);
  const hasTestStrategy = /^##\s+测试策略\s*$/m.test(design);

  return {
    name,
    path: `openspec/changes/${name}`,
    total,
    done,
    hasProposal: !!proposal,
    hasDesign: !!design,
    inWorktree,
    proposal,
    design,
    tasks,
    dependsOn,
    hasTestStrategy,
  };
}
