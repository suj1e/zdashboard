import type { Context } from 'cordis';
import { ReviewStore, type ItemState, type ReviewStatus, type Priority } from '../../server/review-store.js';
import { readBody } from '../../core/read-body.js';

export const apply = {
  inject: ['server', 'dashboard', 'reload'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({ mode: 'review', label: '文档评审', icon: '✅', description: '多文档需求评审与拆解 · zreview' });

      const reviewStore = new ReviewStore(root, () => {
        ctx.reload.broadcast('files');
      });

      ctx.server.route('/__review', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(reviewStore.read()));
      });

      ctx.server.route('/__review/item', async (req, res) => {
        if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const data = reviewStore.updateItem(body.id, {
            answer: body.answer,
            state: body.state as ItemState | undefined,
            priority: body.priority as Priority | undefined,
            title: body.title,
          });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(data));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__review/item/add-child', async (req, res) => {
        if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const data = reviewStore.addChild(body.parentId, body.title, body.priority);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(data));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__review/item/remove', async (req, res) => {
        if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const data = reviewStore.removeItem(body.id);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(data));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__review/status', async (req, res) => {
        if (req.headers['x-stop-token'] !== ctx.server.stopToken) { res.writeHead(403); res.end('forbidden'); return; }
        try {
          const body = JSON.parse(await readBody(req) || '{}');
          const data = reviewStore.setStatus(body.status as ReviewStatus);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(JSON.stringify(data));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'unknown error' }));
        }
      });

      ctx.server.route('/__docs', async (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(JSON.stringify(reviewStore.listDocs()));
      });

      ctx.server.route('/__docs/:name', async (req, res) => {
        try {
          const name = (req as any).params?.name;
          if (!name) throw new Error('missing doc name');
          const content = reviewStore.readDoc(name);
          res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(content);
        } catch (e) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'not found' }));
        }
      });
    });
  },
};
