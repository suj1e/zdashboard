import type { Context } from 'cordis';

export function apply(ctx: Context) {
  ctx.logger.info('view plugin loaded (web only)');
}
