#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { detect } from './server/detect.js';
import type { DetectResult } from './server/detect.js';
import { Context, Service } from 'cordis';
import { ServerService } from './core/server.js';
import { ReloadService } from './core/reload.js';
import { apply as treeApply } from './core/tree.js';
import { DashboardService } from './core/manifest.js';
import { apply as justApply } from './plugins/just/index.js';
import { apply as bugsApply } from './plugins/bugs/index.js';
import { apply as reviewApply } from './plugins/review/index.js';
import { apply as applyApply } from './plugins/apply/index.js';
import { apply as designApply } from './plugins/design/index.js';
import { apply as viewApply } from './plugins/view/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        opts[key] = next;
        i++;
      } else {
        opts[key] = true;
      }
    }
  }
  return {
    dir: typeof opts.dir === 'string' ? opts.dir : process.cwd(),
    port: typeof opts.port === 'string' ? Number(opts.port) : 4190,
    open: !!opts.open,
    page: typeof opts.page === 'string' ? opts.page : null,
    plugins: typeof opts.plugins === 'string' ? opts.plugins : null,
  };
}

async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function loadExternal(ctx: Context, dir: string) {
  if (!dir) return;
  // try tsx loader first
  let tsxLoaded = false;
  try {
    const { register } = await import('tsx/esm/api');
    register();
    tsxLoaded = true;
  } catch {
    // tsx not available
  }

  try {
    const entries = await pathExists(dir) ? await fs.readdir(dir, { withFileTypes: true }) : [];
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const candidates = tsxLoaded ? ['index.ts', 'index.js', 'index.mjs'] : ['index.js', 'index.mjs'];
      for (const name of candidates) {
        const p = path.join(dir, ent.name, name);
        if (await pathExists(p)) {
          try {
            const mod = await import(p);
            const plugin = mod.default;
            if (plugin?.apply) ctx.plugin(plugin);
          } catch (e) {
            console.error(`[zdashboard] failed to load plugin ${ent.name}:`, e);
          }
          break;
        }
      }
    }
  } catch {
    // ignore
  }
}

import { readdir as fsReaddir } from 'node:fs/promises';
const fs = { readdir: fsReaddir };

async function main() {
  const args = parseArgs();
  const root = path.resolve(args.dir);
  const appDir = path.resolve(__dirname, 'web');

  const det = await detect(root);

  const ctx = new Context();

  // core services
  ctx.plugin(ServerService, { root, appDir, port: args.port, open: args.open, detect: det });
  ctx.plugin(ReloadService, { root });
  ctx.plugin(treeApply, { root });
  ctx.plugin(DashboardService);

  // built-in plugins
  ctx.plugin(justApply);
  ctx.plugin(bugsApply);
  ctx.plugin(reviewApply);
  ctx.plugin(applyApply);
  ctx.plugin(designApply);
  ctx.plugin(viewApply);

  // external plugins
  if (args.plugins) {
    await loadExternal(ctx, path.resolve(args.plugins));
  }

  console.log(`[zdashboard] ready`);
  console.log(`[zdashboard] project   -> ${root}`);
  console.log(`[zdashboard] detect    -> openspec:${det.hasOpenspec} docs:${det.hasDocs} just:${det.hasJust} bugs:${det.hasBugs}`);
  if (args.page) {
    console.log(`[zdashboard] page      -> ${args.page}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

