import { createServer } from './server/index.js';
import { detect } from './server/detect.js';

function parseArgs(a: string[]): Record<string, string | true> {
  const o: Record<string, string | true> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].indexOf('--') === 0) {
      const n = a[i + 1];
      o[a[i].slice(2)] = n && n.indexOf('--') !== 0 ? a[++i] : true;
    }
  }
  return o;
}

const args = parseArgs(process.argv.slice(2));
const root = (args.dir as string) ?? '.';

const det = await detect(root);
createServer({
  root,
  port: args.port ? parseInt(args.port as string, 10) : undefined,
  open: !!args.open,
  detect: det,
  mode: args.mode as string | undefined,
});
