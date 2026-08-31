import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { access, readdir } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { parseArgs as utilParseArgs } from 'node:util';
import { detect } from './server/detect.js';
import type { DetectResult } from './server/detect.js';
import { Context, Service } from 'cordis';
import { ServerService, PLUGIN_STATIC_PREFIX } from './core/server.js';
import { ReloadService } from './core/reload.js';
import { apply as treeApply } from './core/tree.js';
import { apply as worktreesApply } from './core/worktrees.js';
import { DashboardService } from './core/manifest.js';
import {
  findReusable,
  stopInstance,
  writeRecord,
  clearRecord,
  stripDeadPluginConfig,
} from './core/instance.js';
import { openUrl } from './core/open-url.js';
import { apply as justApply } from './plugins/just/index.js';
import { apply as designApply } from './plugins/design/index.js';
import { apply as viewApply } from './plugins/view/index.js';
import { apply as statsApply } from './plugins/stats/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PORT = 4190;

function parseArgs() {
  const args = process.argv.slice(2);
  const { values } = utilParseArgs({
    options: {
      dir: { type: 'string' },
      port: { type: 'string' },
      open: { type: 'boolean', default: false },
      page: { type: 'string' },
      restart: { type: 'boolean', default: false },
      plugins: { type: 'string' },
    },
    args,
    strict: false,
    allowPositionals: false,
  });
  return {
    dir: typeof values.dir === 'string' ? values.dir : process.cwd(),
    port: typeof values.port === 'string' ? Number(values.port) : DEFAULT_PORT,
    portExplicit: args.some(a => a === '--port' || a.startsWith('--port=')),
    open: !!values.open,
    page: typeof values.page === 'string' ? values.page : null,
    restart: !!values.restart,
    plugins: typeof values.plugins === 'string' ? values.plugins : null,
  };
}

async function pathExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function loadExternal(ctx: Context, dir: string, root: string) {
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
            const plugin = mod.default ?? mod;
            if (plugin?.apply) {
              try {
                await ctx.plugin(plugin, { root });
              } catch (e) {
                console.error(`[zdashboard] failed to apply plugin ${ent.name}:`, e);
                break;
              }
              // 自动接线约定：mode === 目录名时补 external 标记与 viewerUrl
              const m = ctx.dashboard.get(ent.name);
              if (m && m.mode === ent.name) {
                const patch: Record<string, unknown> = { external: true };
                const webDir = path.join(dir, ent.name, 'web');
                if (await pathExists(path.join(webDir, 'index.html'))) {
                  ctx.server.static(`${PLUGIN_STATIC_PREFIX}${ent.name}/`, webDir);
                  if (!m.viewerUrl) patch.viewerUrl = `${PLUGIN_STATIC_PREFIX}${ent.name}/`;
                }
                ctx.dashboard.register({ ...m, ...patch });
              }
            }
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

  // --- instance reuse (before creating Context) ---
  const existing = await findReusable(root);
  if (existing && !args.restart) {
    const u = `http://localhost:${existing.port}` + (args.page ? `#${args.page}` : '');
    if (args.open) openUrl(u);
    console.log(`[zdashboard] 已复用实例 ${u}（--restart 可强制重开）`);
    // 管道场景下 stdout 是异步写,显式等 flush 再 exit,避免日志被截断
    await new Promise<void>((resolve) => process.stdout.write('', () => resolve()));
    process.exit(0);
  }
  // 记录旧端口（--restart 时用于端口继承；stopInstance 会清 record）
  const oldRecord = existing && args.restart ? existing : null;
  if (oldRecord) {
    console.log(`[zdashboard] --restart：停止旧实例 pid=${oldRecord.pid}`);
    await stopInstance(oldRecord);
  }

  const appDir = path.resolve(__dirname, 'web');

  // built-in plugins:统一数组注册(未来迁移为 definePlugin 产出后无需改动此处)
  const BUILTIN_PLUGINS = [statsApply, justApply, designApply, viewApply];

  // 约定化扫描:启动一次性剥离 dashboard.json 里内置插件的死配置键(未声明 config 即清,external/未知保留)
  if (stripDeadPluginConfig(root, BUILTIN_PLUGINS.map((p) => p.manifest))) {
    console.log('[zdashboard] 已清理 dashboard.json 中内置插件的过时配置键');
  }

  // P2: restart 且有旧记录时，起始端口用 record.port（用户显式 --port 则尊重）
  const startPort = oldRecord && !args.portExplicit ? oldRecord.port : args.port;

  // P0: 数据目录检测（.zdev/ 存在则优先）
  const zdevDir = path.join(root, '.zdev');
  const dataDir = fs.existsSync(zdevDir) ? '.zdev/' : '';

  const det = await detect(root);

  const ctx = new Context();

  // core services
  ctx.plugin(ServerService, {
    root,
    appDir,
    port: startPort,
    open: args.open,
    detect: det,
    page: args.page,
    dataDir: dataDir || undefined,
    onListen: (port: number) => writeRecord(root, port),
  });
  ctx.plugin(ReloadService, { root });
  ctx.plugin(treeApply, { root });
  ctx.plugin(worktreesApply, { root });
  ctx.plugin(DashboardService);

  for (const apply of BUILTIN_PLUGINS) {
    try {
      ctx.plugin(apply, { root });
    } catch (e) {
      console.error('[zdashboard] builtin plugin failed:', e);
    }
  }

  // external plugins
  if (args.plugins) {
    await loadExternal(ctx, path.resolve(args.plugins), root);
  }

  // graceful shutdown: clear .zdev record on SIGTERM / SIGINT
  const shutdown = () => {
    try { clearRecord(root); } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return ctx;
}

await main().catch((e) => {
  console.error(e);
  process.exit(1);
});
