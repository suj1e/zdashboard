import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readdir } from 'node:fs/promises';
import { detect } from './server/detect.js';
import type { DetectResult } from './server/detect.js';
import { Context, Service } from 'cordis';
import { ServerService } from './core/server.js';
import { apply as reloadApply } from './core/reload.js';
import { apply as treeApply } from './core/tree.js';
import { apply as dashboardApply } from './core/manifest.js';
import { apply as justApply } from './plugins/just/index.js';
import { apply as bugsApply } from './plugins/bugs/index.js';
import { apply as reviewApply } from './plugins/review/index.js';
import { apply as applyApply } from './plugins/apply/index.js';
import { apply as designApply } from './plugins/design/index.js';

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
  let tsxLoaded = false;
  try {
    const { register } = await import('tsx/esm/api');
    register();
    tsxLoaded = true;
  } catch {
    // tsx not available
  }

  try {
    const entries = await pathExists(dir) ? await readdir(dir, { withFileTypes: true }) : [];
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

async function main() {
  const args = parseArgs();
  const root = path.resolve(args.dir);
  const appDir = path.resolve(__dirname, 'web');

  const det = await detect(root);

  const ctx = new Context();

  // core services
  ctx.plugin(ServerService, { root, appDir, port: args.port, open: args.open, detect: det, page: args.page });
  ctx.plugin(reloadApply, { root });
  ctx.plugin(treeApply, { root });
  ctx.plugin(dashboardApply);

  // built-in plugins
  const plugins = [
    { name: 'just', apply: justApply },
    { name: 'bugs', apply: bugsApply },
    { name: 'review', apply: reviewApply },
    { name: 'apply', apply: applyApply },
    { name: 'design', apply: designApply },
  ];
  for (const p of plugins) {
    try {
      ctx.plugin(p.apply, { root });
    } catch (e) {
      console.error(`[zdashboard] plugin ${p.name} failed:`, e);
    }
  }

  // external plugins
  if (args.plugins) {
    await loadExternal(ctx, path.resolve(args.plugins));
  }
  return ctx;
}

let gCtx: Context | null = null;
main().then((ctx) => {
  gCtx = ctx;
  setTimeout(() => {
    console.error('[zdashboard] keepalive tick');
  }, 1000);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
