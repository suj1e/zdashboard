import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

export interface DetectResult {
  hasOpenspec: boolean;
  hasDocs: boolean;
  hasJust: boolean;
  hasBugs: boolean;
}

function justAvailable(cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = execFile('just', ['--list', '--unsorted'], { cwd, timeout: 5000 }, (err) => {
      resolve(!err);
    });
    if (child.killed) resolve(false);
  });
}

export async function detect(root: string): Promise<DetectResult> {
  const hasOpenspec = fs.existsSync(path.join(root, 'openspec'));
  const hasDocs = fs.existsSync(path.join(root, 'docs'));
  const hasJust = await justAvailable(root);
  const hasBugs = fs.existsSync(path.join(root, '.zgoal', 'config.yaml'));
  return { hasOpenspec, hasDocs, hasJust, hasBugs };
}
