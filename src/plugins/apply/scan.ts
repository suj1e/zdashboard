import fs from 'node:fs';
import path from 'node:path';

export interface ChangeSummary {
  name: string;
  path: string;
  total: number;
  done: number;
  hasProposal: boolean;
  hasDesign: boolean;
}

export interface ChangeDetail extends ChangeSummary {
  proposal?: string;
  design?: string;
  tasks: string;
}

function countTasks(md: string): { total: number; done: number } {
  const all = (md.match(/^\s*-\s*\[[ xX]\]\s*/gm) || []).length;
  const done = (md.match(/^\s*-\s*\[[xX]\]\s*/gm) || []).length;
  return { total: all, done };
}

function readText(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

export function scanApplyChanges(root: string): ChangeSummary[] {
  const changesDir = path.join(root, 'openspec', 'changes');
  if (!fs.existsSync(changesDir)) return [];
  const out: ChangeSummary[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.') || ent.name === 'archive') continue;
    const dir = path.join(changesDir, ent.name);
    const tasks = readText(path.join(dir, 'tasks.md'));
    const { total, done } = countTasks(tasks);
    out.push({
      name: ent.name,
      path: `openspec/changes/${ent.name}`,
      total,
      done,
      hasProposal: fs.existsSync(path.join(dir, 'proposal.md')),
      hasDesign: fs.existsSync(path.join(dir, 'design.md')),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function readApplyChange(root: string, name: string): ChangeDetail {
  const dir = path.join(root, 'openspec', 'changes', name);
  const proposal = readText(path.join(dir, 'proposal.md'));
  const design = readText(path.join(dir, 'design.md'));
  const tasks = readText(path.join(dir, 'tasks.md'));
  const { total, done } = countTasks(tasks);
  return {
    name,
    path: `openspec/changes/${name}`,
    total,
    done,
    hasProposal: !!proposal,
    hasDesign: !!design,
    proposal,
    design,
    tasks,
  };
}
