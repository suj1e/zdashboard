import type { Context } from 'cordis';
import http from 'node:http';
import { ReviewStore, type ItemState, type ReviewStatus } from '../../server/review-store.js';
import { readBody } from '../../core/read-body.js';

export const apply = {
  inject: ['server', 'dashboard', 'reload'] as const,
  apply(ctx: Context, config: { root: string }) {
    const root = config.root;

    ctx.inject(['server'], () => {
      if (!ctx.server?.route) return;

      ctx.dashboard.register({ mode: 'review', label: '文档评审', icon: '✅', description: 'review.yaml 逐项对齐' });

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
          const data = reviewStore.updateItem(body.id, { answer: body.answer, state: body.state as ItemState | undefined });
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
        res.end(JSON.stringify(reviewStore.docs()));
      });
    });
  },
};

