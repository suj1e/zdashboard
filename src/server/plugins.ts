/**
 * zdashboard plugin system
 *
 * Plugin contract:
 * {
 *   mode: string;              // unique mode identifier, e.g. 'bugs'
 *   label: string;             // human label, e.g. '禅道'
 *   icon?: string;             // optional emoji or icon name
 *   viewer: () => Promise<{ default: React.ComponentType }>;
 *   sidebar?: () => Promise<{ default: React.ComponentType }>;
 *   apiRoutes?: Record<string, (req: http.IncomingMessage, res: http.ServerResponse, root: string) => void>;
 * }
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DashboardPlugin {
  mode: string;
  label: string;
  icon?: string;
  viewer?: () => Promise<{ default: React.ComponentType }>;
  sidebar?: () => Promise<{ default: React.ComponentType }>;
  apiRoutes?: Record<string, (req: http.IncomingMessage, res: http.ServerResponse, root: string) => void>;
}

export interface PluginContext {
  root: string;
  appDir: string;
}

const builtinPlugins = new Map<string, DashboardPlugin>();

export function registerBuiltin(plugin: DashboardPlugin) {
  builtinPlugins.set(plugin.mode, plugin);
}

export function getBuiltin(mode: string): DashboardPlugin | undefined {
  return builtinPlugins.get(mode);
}

export function allBuiltins(): DashboardPlugin[] {
  return Array.from(builtinPlugins.values());
}

export async function loadExternalPlugins(pluginDirs: string[]): Promise<DashboardPlugin[]> {
  const plugins: DashboardPlugin[] = [];
  for (const dir of pluginDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const indexPath = path.join(dir, entry.name, 'index.ts');
      if (!fs.existsSync(indexPath)) continue;
      try {
        const mod = await import(path.join(dir, entry.name, 'index.ts'));
        const plugin = mod.default as DashboardPlugin;
        if (plugin?.mode) {
          plugins.push(plugin);
        }
      } catch (e) {
        console.error(`[zdashboard] failed to load plugin ${entry.name}:`, e);
      }
    }
  }
  return plugins;
}
