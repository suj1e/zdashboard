import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  // clean 会连 vite 的 dist/web 一起清掉(单独跑 tsup 时首页 404),cli.js 固定名覆盖写无残留
  clean: false,
  sourcemap: true,
});
