import type { Context } from 'cordis';
import fs from 'node:fs';
import path from 'node:path';

interface Note {
  id: string;
  text: string;
  done: boolean;
  updatedAt: number;
}

const NOTES_PATH = '.zdashboard-notes.json';

function loadNotes(root: string): Note[] {
  const p = path.join(root, NOTES_PATH);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function saveNotes(root: string, notes: Note[]) {
  const p = path.join(root, NOTES_PATH);
  fs.writeFileSync(p, JSON.stringify(notes, null, 2), 'utf-8');
}

export default {
  inject: ['server', 'dashboard'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server', 'dashboard'], () => {
      const server = (ctx as any).server;
      const dashboard = (ctx as any).dashboard;
      if (!server?.route || !dashboard?.register) return;

      dashboard.register({
        mode: 'notes',
        label: '便签',
        icon: '🗒️',
        description: '示例插件 · 读写持久化 + 热刷新',
      });

      server.route('/__notes/data', (_req: unknown, res: import('node:http').ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(loadNotes(root)));
      });

      server.route('/__notes/save', async (req: any, res: import('node:http').ServerResponse) => {
        if (req.headers['x-stop-token'] !== server.stopToken) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: 'unauthorized' }));
          return;
        }
        let body: Note[];
        try { body = await new Promise((resolve, reject) => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); }); }
        catch { res.writeHead(400); res.end(JSON.stringify({ error: 'invalid json' })); return; }
        if (!Array.isArray(body)) { res.writeHead(400); res.end(JSON.stringify({ error: 'expected array' })); return; }
        saveNotes(root, body);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      });
    });
  },
};
